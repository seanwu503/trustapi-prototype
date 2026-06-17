const { isDatabaseConfigured, query } = require('../db/client');
const { getWalletActivitySummary } = require('../integrations/blockchainClient');

function createValidationError(code, message) {
    const error = new Error(message);
    error.statusCode = 400;
    error.code = code;
    return error;
}

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function validateWalletIngestionInput(input) {
    const wallet = normalizeText(input && input.wallet);
    const chain = normalizeText(input && input.chain).toLowerCase();

    if (!wallet) {
        throw createValidationError('missing_wallet', 'wallet is required');
    }

    if (!chain) {
        throw createValidationError('missing_chain', 'chain is required');
    }

    return {
        wallet,
        chain
    };
}

async function saveWallet({ wallet, chain, source }) {
    if (!isDatabaseConfigured()) {
        return 'not_configured';
    }

    await query(
        `
        insert into wallets (wallet, chain, ingestion_status, source, updated_at)
        values ($1, $2, 'ingested', $3, now())
        on conflict (wallet, chain)
        do update set
            ingestion_status = excluded.ingestion_status,
            source = excluded.source,
            updated_at = now()
        `,
        [wallet, chain, source]
    );

    return 'ok';
}

async function ingestWallet(input) {
    const { wallet, chain } = validateWalletIngestionInput(input);
    const source = 'manual';
    let database = 'not_configured';
    let blockchain;

    try {
        database = await saveWallet({ wallet, chain, source });
    } catch (error) {
        console.error('Failed to ingest wallet:', error.message);
        database = 'error';
    }

    try {
        blockchain = await getWalletActivitySummary({ wallet, chain });
    } catch (error) {
        console.error('Failed to fetch blockchain summary:', error.message);
        blockchain = {
            status: 'error',
            provider: 'rpc',
            transaction_count: null
        };
    }

    return {
        wallet,
        chain,
        status: 'ingested',
        source,
        database,
        blockchain,
        message: 'Wallet ingestion completed.'
    };
}

module.exports = {
    ingestWallet,
    validateWalletIngestionInput
};
