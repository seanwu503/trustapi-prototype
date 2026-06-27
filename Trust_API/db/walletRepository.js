const { isDatabaseConfigured, query } = require('./client');

async function saveWalletSnapshot(walletInfo) {
    const walletResult = await query(
        `
        insert into wallets (address, chain, updated_at)
        values ($1, $2, now())
        on conflict (address, chain)
        do update set updated_at = now()
        returning id
        `,
        [walletInfo.wallet, walletInfo.chain]
    );

    const walletId = walletResult.rows[0].id;

    const snapshotResult = await query(
        `
        insert into wallet_snapshots (
            wallet_id,
            transaction_count,
            balance_eth,
            transfer_from_count,
            transfer_to_count,
            transfer_window_days,
            wallet_age_days,
            first_activity_at,
            daily_transfer_counts
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        returning id
        `,
        [
            walletId,
            walletInfo.transaction_count,
            walletInfo.balance_eth,
            walletInfo.transfer_from_count,
            walletInfo.transfer_to_count,
            walletInfo.transfer_window_days,
            walletInfo.wallet_age_days,
            walletInfo.first_activity_at,
            JSON.stringify(walletInfo.daily_transfer_counts)
        ]
    );

    return {
        wallet_id: walletId,
        snapshot_id: snapshotResult.rows[0].id
    };
}

async function trySaveWalletSnapshot(walletInfo) {
    if (!isDatabaseConfigured()) {
        console.warn('DATABASE_URL not set — skipping DB write');
        return { saved: false };
    }

    try {
        const saved = await saveWalletSnapshot(walletInfo);
        return { saved: true, snapshot_id: saved.snapshot_id };
    } catch (error) {
        console.error('Failed to save wallet snapshot:', error.message);
        return { saved: false };
    }
}

module.exports = {
    saveWalletSnapshot,
    trySaveWalletSnapshot
};
