const ALCHEMY_URL = 'https://eth-mainnet.g.alchemy.com/v2';
const TRANSFER_WINDOW_DAYS = 30;
const SECONDS_PER_BLOCK = 12;

const WALLET_PATTERN = /^0x[a-fA-F0-9]{40}$/;

function getApiKey() {
    return process.env.ALCHEMY_API_KEY || '';
}

function createError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function normalizeWallet(wallet) {
    const value = typeof wallet === 'string' ? wallet.trim() : '';

    if (!value) {
        throw createError(400, 'wallet is required');
    }

    if (!WALLET_PATTERN.test(value)) {
        throw createError(400, 'invalid wallet address');
    }

    return value;
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

async function callRpc(method, params) {
    const apiKey = getApiKey();

    if (!apiKey) {
        throw createError(503, 'alchemy not configured');
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
        throw createError(502, 'alchemy request failed');
    }

    const data = await response.json();

    console.log('[Alchemy response]', JSON.stringify({
        method,
        result: formatResponseForLog(data.result),
        error: data.error || null
    }, null, 2));

    if (data.error) {
        throw createError(502, 'alchemy request failed');
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

async function countAssetTransfers(filter, fromBlock) {
    let total = 0;
    let pageKey;

    do {
        const params = {
            fromBlock,
            toBlock: 'latest',
            category: ['external', 'erc20'],
            maxCount: '0x3e8',
            ...filter
        };

        if (pageKey) {
            params.pageKey = pageKey;
        }

        const result = await callRpc('alchemy_getAssetTransfers', [params]);
        const transfers = result && Array.isArray(result.transfers) ? result.transfers : [];
        total += transfers.length;
        pageKey = result && result.pageKey;
    } while (pageKey);

    return total;
}

async function getWalletInfo(walletInput) {
    const wallet = normalizeWallet(walletInput);
    const fromBlock = await getFromBlockHex30DaysAgo();

    const transaction_count = await getTransactionCount(wallet);
    const balance_eth = await getBalanceEth(wallet);
    const transfer_from_count = await countAssetTransfers({ fromAddress: wallet }, fromBlock);
    const transfer_to_count = await countAssetTransfers({ toAddress: wallet }, fromBlock);

    return {
        wallet,
        chain: 'ethereum',
        transfer_window_days: TRANSFER_WINDOW_DAYS,
        transaction_count,
        balance_eth,
        transfer_from_count,
        transfer_to_count
    };
}

module.exports = {
    getWalletInfo
};
