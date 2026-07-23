function mergeDailyCounts(dailyTransferCounts) {
    const out = dailyTransferCounts?.out || {};
    const inn = dailyTransferCounts?.in || {};
    const merged = {};

    for (const [day, count] of Object.entries(out)) {
        merged[day] = (merged[day] || 0) + count;
    }

    for (const [day, count] of Object.entries(inn)) {
        merged[day] = (merged[day] || 0) + count;
    }

    return merged;
}

function computeActivityFrequency(snapshot) {
    const windowDays = snapshot.transfer_window_days || 30;
    const total = snapshot.transfer_from_count + snapshot.transfer_to_count;

    return Number((total / windowDays).toFixed(4));
}

const MAX_BURST_SCORE = 10;
const NFT_CATEGORIES = new Set(['erc721', 'erc1155']);

function computeBurstScore(dailyTransferCounts) {
    const merged = mergeDailyCounts(dailyTransferCounts);
    const dailyTotals = Object.values(merged);

    if (dailyTotals.length === 0) {
        return 0;
    }

    const total = dailyTotals.reduce((sum, count) => sum + count, 0);
    const mean = total / dailyTotals.length;
    const max = Math.max(...dailyTotals);

    if (mean === 0) {
        return 0;
    }

    const ratio = max / mean;

    return Number(Math.min(ratio, MAX_BURST_SCORE).toFixed(4));
}

function normalizeAddress(value) {
    if (!value || typeof value !== 'string') {
        return null;
    }

    return value.toLowerCase();
}

function computeTransactionDiversity(transfers) {
    if (transfers.length === 0) {
        return 0;
    }

    const counterparties = new Set();

    for (const transfer of transfers) {
        const counterparty = normalizeAddress(transfer.counterparty);

        if (counterparty) {
            counterparties.add(counterparty);
        }
    }

    return Number((counterparties.size / transfers.length).toFixed(4));
}

function computeContractInteractionRatio(transfers) {
    if (transfers.length === 0) {
        return 0;
    }

    let withContract = 0;

    for (const transfer of transfers) {
        if (normalizeAddress(transfer.contract_address)) {
            withContract += 1;
        }
    }

    return Number((withContract / transfers.length).toFixed(4));
}

function computeTransactionEntropy(transfers) {
    if (transfers.length === 0) {
        return 0;
    }

    const counts = new Map();

    for (const transfer of transfers) {
        const counterparty = normalizeAddress(transfer.counterparty) || 'unknown';
        counts.set(counterparty, (counts.get(counterparty) || 0) + 1);
    }

    if (counts.size <= 1) {
        return 0;
    }

    const total = transfers.length;
    let entropy = 0;

    for (const count of counts.values()) {
        const p = count / total;
        entropy -= p * Math.log2(p);
    }

    // Normalize to 0–1 by max entropy for this transfer count.
    const maxEntropy = Math.log2(Math.min(counts.size, total));

    if (maxEntropy === 0) {
        return 0;
    }

    return Number((entropy / maxEntropy).toFixed(4));
}

function computeNftStats(transfers) {
    if (transfers.length === 0) {
        return {
            nft_transfer_count: 0,
            nft_activity_ratio: 0
        };
    }

    let nftTransferCount = 0;

    for (const transfer of transfers) {
        if (NFT_CATEGORIES.has(transfer.category)) {
            nftTransferCount += 1;
        }
    }

    return {
        nft_transfer_count: nftTransferCount,
        nft_activity_ratio: Number((nftTransferCount / transfers.length).toFixed(4))
    };
}

function extractFeaturesFromSnapshot(snapshot, transfers = []) {
    const dailyTransferCounts = snapshot.daily_transfer_counts || { out: {}, in: {} };
    const transferRows = Array.isArray(transfers) ? transfers : [];
    const nftStats = computeNftStats(transferRows);

    return {
        wallet_age_days: snapshot.wallet_age_days,
        activity_frequency: computeActivityFrequency(snapshot),
        burst_score: computeBurstScore(dailyTransferCounts),
        transaction_diversity: computeTransactionDiversity(transferRows),
        contract_interaction_ratio: computeContractInteractionRatio(transferRows),
        transaction_entropy: computeTransactionEntropy(transferRows),
        nft_transfer_count: nftStats.nft_transfer_count,
        nft_activity_ratio: nftStats.nft_activity_ratio
    };
}

module.exports = {
    extractFeaturesFromSnapshot
};
