const EVM_CHAINS = new Set([
    'ethereum',
    'sepolia',
    'polygon',
    'arbitrum',
    'optimism',
    'base'
]);

function isBlockchainProviderConfigured() {
    return Boolean(process.env.BLOCKCHAIN_PROVIDER_URL);
}

function getProviderUrl() {
    const providerUrl = process.env.BLOCKCHAIN_PROVIDER_URL || '';
    const apiKey = process.env.BLOCKCHAIN_API_KEY || '';

    return apiKey ? providerUrl.replace('{API_KEY}', apiKey) : providerUrl;
}

async function callJsonRpc(method, params) {
    const response = await fetch(getProviderUrl(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params
        }),
        signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
        throw new Error(`Blockchain provider returned ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.message || 'Blockchain provider returned an error');
    }

    return data.result;
}

async function getWalletActivitySummary({ wallet, chain }) {
    if (!isBlockchainProviderConfigured()) {
        return {
            status: 'not_configured',
            provider: 'none',
            transaction_count: null
        };
    }

    if (!EVM_CHAINS.has(chain)) {
        return {
            status: 'unsupported_chain',
            provider: 'rpc',
            transaction_count: null
        };
    }

    const transactionCountHex = await callJsonRpc('eth_getTransactionCount', [wallet, 'latest']);
    const transactionCount = Number.parseInt(transactionCountHex, 16);

    return {
        status: 'ok',
        provider: 'rpc',
        transaction_count: Number.isNaN(transactionCount) ? null : transactionCount
    };
}

module.exports = {
    getWalletActivitySummary,
    isBlockchainProviderConfigured
};
