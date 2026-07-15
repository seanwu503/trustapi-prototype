const { isDatabaseConfigured, query } = require('./client');
const { extractFeaturesFromSnapshot } = require('../featurePipeline');
const { getWalletInfo } = require('../alchemyClient');
const { saveWalletSnapshot } = require('./walletRepository');
const { createError } = require('../middleware/errors');

const FEATURE_SELECT = `
    select
        wf.id as feature_id,
        wf.wallet_id,
        wf.snapshot_id,
        wf.wallet_age_days,
        wf.activity_frequency,
        wf.burst_score,
        wf.computed_at as feature_computed_at,
        ws.fetched_at as snapshot_fetched_at,
        w.address as wallet
    from wallet_features wf
    join wallets w on w.id = wf.wallet_id
    join wallet_snapshots ws on ws.id = wf.snapshot_id
`;

async function getWalletByAddress(address, chain = 'ethereum') {
    const result = await query(
        `
        select id, address, chain
        from wallets
        where address = $1 and chain = $2
        `,
        [address, chain]
    );

    return result.rows[0] || null;
}

async function getLatestSnapshot(walletId) {
    const result = await query(
        `
        select *
        from wallet_snapshots
        where wallet_id = $1
        order by fetched_at desc
        limit 1
        `,
        [walletId]
    );

    return result.rows[0] || null;
}

async function getSnapshotById(snapshotId) {
    const result = await query(
        `
        select *
        from wallet_snapshots
        where id = $1
        `,
        [snapshotId]
    );

    return result.rows[0] || null;
}

async function getFeatureById(featureId) {
    const result = await query(
        `${FEATURE_SELECT} where wf.id = $1`,
        [featureId]
    );

    return result.rows[0] || null;
}

async function getLatestFeaturesByWallet(wallet, chain = 'ethereum') {
    const result = await query(
        `
        ${FEATURE_SELECT}
        where w.address = $1 and w.chain = $2
        order by wf.computed_at desc
        limit 1
        `,
        [wallet, chain]
    );

    return result.rows[0] || null;
}

async function getLatestFeaturesForAllWallets() {
    const result = await query(
        `
        select distinct on (wf.wallet_id)
            wf.id as feature_id,
            wf.wallet_id,
            wf.snapshot_id,
            wf.wallet_age_days,
            wf.activity_frequency,
            wf.burst_score,
            wf.computed_at as feature_computed_at,
            ws.fetched_at as snapshot_fetched_at,
            w.address as wallet
        from wallet_features wf
        join wallets w on w.id = wf.wallet_id
        join wallet_snapshots ws on ws.id = wf.snapshot_id
        order by wf.wallet_id, wf.computed_at desc
        `
    );

    return result.rows;
}

async function saveWalletFeatures(walletId, snapshotId, features) {
    const result = await query(
        `
        insert into wallet_features (
            wallet_id,
            snapshot_id,
            wallet_age_days,
            activity_frequency,
            burst_score
        )
        values ($1, $2, $3, $4, $5)
        returning id, computed_at
        `,
        [
            walletId,
            snapshotId,
            features.wallet_age_days,
            features.activity_frequency,
            features.burst_score
        ]
    );

    return {
        feature_id: result.rows[0].id,
        computed_at: result.rows[0].computed_at
    };
}

async function resolveSnapshot(wallet, refresh) {
    if (refresh) {
        const walletInfo = await getWalletInfo(wallet);
        const saved = await saveWalletSnapshot(walletInfo);
        const snapshot = await getSnapshotById(saved.snapshot_id);

        return {
            wallet_id: saved.wallet_id,
            snapshot
        };
    }

    const walletRow = await getWalletByAddress(wallet);

    if (!walletRow) {
        throw createError(404, 'no snapshot found — use /get_wallet_info first or set refresh to true', 'SNAPSHOT_NOT_FOUND');
    }

    const snapshot = await getLatestSnapshot(walletRow.id);

    if (!snapshot) {
        throw createError(404, 'no snapshot found — use /get_wallet_info first or set refresh to true', 'SNAPSHOT_NOT_FOUND');
    }

    return {
        wallet_id: walletRow.id,
        snapshot
    };
}

async function extractFeatures(wallet, refresh = false) {
    if (!isDatabaseConfigured()) {
        throw createError(503, 'database not configured', 'DATABASE_NOT_CONFIGURED');
    }

    const { wallet_id, snapshot } = await resolveSnapshot(wallet, refresh);
    const features = extractFeaturesFromSnapshot(snapshot);
    const saved = await saveWalletFeatures(wallet_id, snapshot.id, features);

    return {
        wallet,
        refresh,
        wallet_id,
        snapshot_id: snapshot.id,
        feature_id: saved.feature_id,
        wallet_age_days: features.wallet_age_days,
        activity_frequency: features.activity_frequency,
        burst_score: features.burst_score,
        computed_at: saved.computed_at
    };
}

async function ensureFeaturesReady(wallet) {
    if (!isDatabaseConfigured()) {
        throw createError(503, 'database not configured', 'DATABASE_NOT_CONFIGURED');
    }

    const existingFeatures = await getLatestFeaturesByWallet(wallet);

    if (existingFeatures) {
        return;
    }

    const walletRow = await getWalletByAddress(wallet);

    if (!walletRow) {
        throw createError(404, 'wallet not found — no snapshot available', 'WALLET_NOT_FOUND');
    }

    const snapshot = await getLatestSnapshot(walletRow.id);

    if (!snapshot) {
        throw createError(404, 'wallet not found — no snapshot available', 'WALLET_NOT_FOUND');
    }

    await extractFeatures(wallet, false);
}

module.exports = {
    extractFeatures,
    ensureFeaturesReady,
    getFeatureById,
    getLatestFeaturesByWallet,
    getLatestFeaturesForAllWallets
};
