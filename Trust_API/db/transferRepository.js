const { query } = require('./client');

const TRANSFER_COLUMNS = 14;
// Postgres caps a statement at 65535 bind params; 500 rows * 14 cols stays well under.
const BATCH_SIZE = 500;

async function insertBatch(rows) {
    const placeholders = [];
    const values = [];

    rows.forEach((row, index) => {
        const base = index * TRANSFER_COLUMNS;
        const cols = Array.from({ length: TRANSFER_COLUMNS }, (_, i) => `$${base + i + 1}`);
        placeholders.push(`(${cols.join(', ')})`);

        values.push(
            row.wallet_id,
            row.snapshot_id,
            row.direction,
            row.category,
            row.counterparty ?? null,
            row.contract_address ?? null,
            row.tx_hash ?? null,
            row.unique_id ?? null,
            row.value ?? null,
            row.method_id ?? null,
            row.is_error ?? null,
            row.block_number ?? null,
            row.occurred_at ?? null,
            row.source || 'alchemy'
        );
    });

    const result = await query(
        `
        insert into wallet_transfers (
            wallet_id, snapshot_id, direction, category, counterparty,
            contract_address, tx_hash, unique_id, value, method_id,
            is_error, block_number, occurred_at, source
        )
        values ${placeholders.join(', ')}
        on conflict (wallet_id, direction, unique_id) where unique_id is not null
        do nothing
        `,
        values
    );

    return result.rowCount;
}

// Persists per-transfer rows produced by alchemyClient.getWalletInfo().
// Re-fetches are idempotent: the partial unique index (wallet_id, direction,
// unique_id) makes duplicate transfers a no-op via ON CONFLICT DO NOTHING.
async function saveWalletTransfers(walletId, snapshotId, transfers) {
    if (!Array.isArray(transfers) || transfers.length === 0) {
        return { received: 0, inserted: 0 };
    }

    const rows = transfers.map((transfer) => ({
        ...transfer,
        wallet_id: walletId,
        snapshot_id: snapshotId
    }));

    let inserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        inserted += await insertBatch(rows.slice(i, i + BATCH_SIZE));
    }

    return { received: rows.length, inserted };
}

async function getTransfersBySnapshotId(snapshotId) {
    const result = await query(
        `
        select
            direction,
            category,
            counterparty,
            contract_address,
            tx_hash,
            unique_id,
            value,
            block_number,
            occurred_at,
            source
        from wallet_transfers
        where snapshot_id = $1
        `,
        [snapshotId]
    );

    return result.rows;
}

module.exports = {
    saveWalletTransfers,
    getTransfersBySnapshotId
};
