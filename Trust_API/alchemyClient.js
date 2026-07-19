const { createError } = require('./middleware/errors');

const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com/v2';
const TRANSFER_WINDOW_DAYS = 30;
const SECONDS_PER_BLOCK = 12;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// external = plain ETH, erc20 = fungible tokens, erc721/erc1155 = NFTs.
// `internal` (contract-moved ETH) is intentionally excluded for now.
const TRANSFER_CATEGORIES = ['external', 'erc20', 'erc721', 'erc1155'];

const WALLET_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function getApiKey() {
    return process.env.ALCHEMY_API_KEY || '';
}

function normalizeWallet(wallet) {
    const value = typeof wallet === 'string' ? wallet.trim() : '';

    if (!value) {
        throw createError(400, 'wallet is required', 'WALLET_REQUIRED');
    }

    if (!WALLET_PATTERN.test(value)) {
        throw createError(400, 'invalid wallet address', 'INVALID_WALLET');
    }

    return value.toLowerCase();
}

function parseHexInt(hexValue) {
    return Number.parseInt(hexValue, 16);
}

function weiToEth(weiHex) {
    const wei = BigInt(weiHex);
    const whole = wei / 1000000000000000000n;
    const fraction = wei % 1000000000000000000n;

    if (fraction === 0n) {
        return whole.toString();
    }

    const fractionText = fraction.toString().padStart(18, '0').replace(/0+$/, '');
    return `${whole}.${fractionText}`;
}

function formatResponseForLog(result) {
    if (!result || !Array.isArray(result.transfers)) {
        return result;
    }

    return {
        ...result,
        transfers: `[${result.transfers.length} transfers omitted from log]`
    };
}

function parseTransferTimestamp(transfer) {
    const raw = transfer && transfer.metadata && transfer.metadata.blockTimestamp;

    if (raw === undefined || raw === null || raw === '') {
        return null;
    }

    if (/^\d+$/.test(String(raw))) {
        return Number(raw);
    }

    const parsed = Date.parse(String(raw));

    if (Number.isNaN(parsed)) {
        return null;
    }

    return Math.floor(parsed / 1000);
}

async function getBlockTimestamp(blockNumHex, blockTimestampCache) {
    if (!blockNumHex) {
        return null;
    }

    if (blockTimestampCache.has(blockNumHex)) {
        return blockTimestampCache.get(blockNumHex);
    }

    const block = await callRpc('eth_getBlockByNumber', [blockNumHex, false]);
    const timestamp = block && block.timestamp ? parseHexInt(block.timestamp) : null;
    blockTimestampCache.set(blockNumHex, timestamp);

    return timestamp;
}

async function getTransferTimestamp(transfer, blockTimestampCache) {
    const fromMetadata = parseTransferTimestamp(transfer);

    if (fromMetadata !== null) {
        return fromMetadata;
    }

    if (transfer && transfer.blockNum) {
        return getBlockTimestamp(transfer.blockNum, blockTimestampCache);
    }

    return null;
}

function toUtcDateKey(unixSeconds) {
    return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

async function normalizeTransfer(transfer, direction, blockTimestampCache) {
    const timestamp = await getTransferTimestamp(transfer, blockTimestampCache);
    const contractAddress = transfer.rawContract && transfer.rawContract.address
        ? transfer.rawContract.address
        : null;
    const counterparty = direction === 'out' ? transfer.to : transfer.from;

    return {
        direction,
        category: transfer.category || null,
        counterparty: counterparty || null,
        contract_address: contractAddress,
        tx_hash: transfer.hash || null,
        unique_id: transfer.uniqueId || null,
        value: transfer.value === undefined || transfer.value === null ? null : transfer.value,
        block_number: transfer.blockNum ? parseHexInt(transfer.blockNum) : null,
        occurred_at: timestamp === null ? null : new Date(timestamp * 1000).toISOString(),
        // Internal-only: used to build daily counts; stripped before returning.
        timestamp
    };
}

async function callRpc(method, params) {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw createError(503, 'alchemy not configured', 'ALCHEMY_NOT_CONFIGURED');
    }

    const requestBody = {
        jsonrpc: '2.0',
        id: 1,
        method,
        params
    };

    console.log('[Alchemy request]', JSON.stringify({ method, params }, null, 2));

    const response = await fetch(`${ALCHEMY_URL}/${apiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
        console.log('[Alchemy response]', JSON.stringify({
            method,
            status: response.status,
            error: 'HTTP request failed'
        }, null, 2));
        throw createError(502, 'alchemy request failed', 'ALCHEMY_REQUEST_FAILED');
    }

    const data = await response.json();

    console.log('[Alchemy response]', JSON.stringify({
        method,
        result: formatResponseForLog(data.result),
        error: data.error || null
    }, null, 2));

    if (data.error) {
        throw createError(502, 'alchemy request failed', 'ALCHEMY_REQUEST_FAILED');
    }

    return data.result;
}

async function getTransactionCount(wallet) {
    const result = await callRpc('eth_getTransactionCount', [wallet, 'latest']);
    return parseHexInt(result);
}

async function getBalanceEth(wallet) {
    const result = await callRpc('eth_getBalance', [wallet, 'latest']);
    return weiToEth(result);
}

async function getFromBlockHex30DaysAgo() {
    const latestHex = await callRpc('eth_blockNumber', []);
    const latestBlock = parseHexInt(latestHex);
    const blocksBack = Math.ceil((TRANSFER_WINDOW_DAYS * 24 * 60 * 60) / SECONDS_PER_BLOCK);
    const fromBlock = Math.max(0, latestBlock - blocksBack);

    return '0x' + fromBlock.toString(16);
}

async function collectTransfers(filter, direction, fromBlock, blockTimestampCache) {
    const dailyCounts = {};
    const transfers = [];
    let total = 0;
    let pageKey;

    do {
        const params = {
            fromBlock,
            toBlock: 'latest',
            category: TRANSFER_CATEGORIES,
            maxCount: '0x3e8',
            ...filter
        };

        if (pageKey) {
            params.pageKey = pageKey;
        }

        const result = await callRpc('alchemy_getAssetTransfers', [params]);
        const pageTransfers = result && Array.isArray(result.transfers) ? result.transfers : [];

        for (const transfer of pageTransfers) {
            const { timestamp, ...row } = await normalizeTransfer(transfer, direction, blockTimestampCache);

            if (timestamp !== null) {
                const day = toUtcDateKey(timestamp);
                dailyCounts[day] = (dailyCounts[day] || 0) + 1;
            }

            transfers.push(row);
            total += 1;
        }

        pageKey = result && result.pageKey;
    } while (pageKey);

    return { dailyCounts, total, transfers };
}

async function getEarliestTransferTimestamp(wallet, direction, blockTimestampCache) {
    const filter = direction === 'out'
        ? { fromAddress: wallet }
        : { toAddress: wallet };

    const result = await callRpc('alchemy_getAssetTransfers', [{
        fromBlock: '0x0',
        toBlock: 'latest',
        category: TRANSFER_CATEGORIES,
        maxCount: '0x1',
        order: 'asc',
        ...filter
    }]);

    const transfer = result && Array.isArray(result.transfers) ? result.transfers[0] : null;

    if (!transfer) {
        return null;
    }

    return getTransferTimestamp(transfer, blockTimestampCache);
}

async function getWalletAge(wallet, blockTimestampCache) {
    const outTimestamp = await getEarliestTransferTimestamp(wallet, 'out', blockTimestampCache);
    const inTimestamp = await getEarliestTransferTimestamp(wallet, 'in', blockTimestampCache);
    const timestamps = [outTimestamp, inTimestamp].filter((value) => value !== null);

    if (timestamps.length === 0) {
        return {
            wallet_age_days: null,
            first_activity_at: null
        };
    }

    const firstActivityUnix = Math.min(...timestamps);
    const firstActivityAt = new Date(firstActivityUnix * 1000).toISOString();
    const walletAgeDays = Math.floor((Date.now() - firstActivityUnix * 1000) / MS_PER_DAY);

    return {
        wallet_age_days: walletAgeDays,
        first_activity_at: firstActivityAt
    };
}

async function getWalletInfo(walletInput) {
    const wallet = normalizeWallet(walletInput);
    const fromBlock = await getFromBlockHex30DaysAgo();
    const blockTimestampCache = new Map();

    const transaction_count = await getTransactionCount(wallet);
    const balance_eth = await getBalanceEth(wallet);
    const { wallet_age_days, first_activity_at } = await getWalletAge(wallet, blockTimestampCache);
    const outgoing = await collectTransfers({ fromAddress: wallet }, 'out', fromBlock, blockTimestampCache);
    const incoming = await collectTransfers({ toAddress: wallet }, 'in', fromBlock, blockTimestampCache);

    return {
        wallet,
        chain: 'ethereum',
        transfer_window_days: TRANSFER_WINDOW_DAYS,
        transaction_count,
        balance_eth,
        transfer_from_count: outgoing.total,
        transfer_to_count: incoming.total,
        wallet_age_days,
        first_activity_at,
        daily_transfer_counts: {
            out: outgoing.dailyCounts,
            in: incoming.dailyCounts
        },
        transfers: [...outgoing.transfers, ...incoming.transfers]
    };
}

module.exports = {
    getWalletInfo,
    normalizeWallet
};
