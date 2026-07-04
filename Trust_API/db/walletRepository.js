const { isDatabaseConfigured, query, getPool } = require('./client');

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

async function deleteWalletByAddress(address, chain = 'ethereum') {
    const pool = getPool();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const walletResult = await client.query(
            `
            select id, address, chain
            from wallets
            where address = $1 and chain = $2
            `,
            [address, chain]
        );

        const wallet = walletResult.rows[0];

        if (!wallet) {
            await client.query('ROLLBACK');
            return null;
        }

        const featuresResult = await client.query(
            `
            delete from wallet_features
            where wallet_id = $1
            `,
            [wallet.id]
        );

        const snapshotsResult = await client.query(
            `
            delete from wallet_snapshots
            where wallet_id = $1
            `,
            [wallet.id]
        );

        await client.query(
            `
            delete from wallets
            where id = $1
            `,
            [wallet.id]
        );

        await client.query('COMMIT');

        return {
            id: wallet.id,
            address: wallet.address,
            chain: wallet.chain,
            features_deleted: featuresResult.rowCount,
            snapshots_deleted: snapshotsResult.rowCount
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    saveWalletSnapshot,
    trySaveWalletSnapshot,
    deleteWalletByAddress
};
