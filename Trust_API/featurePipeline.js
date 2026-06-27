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

function extractFeaturesFromSnapshot(snapshot) {
    const dailyTransferCounts = snapshot.daily_transfer_counts || { out: {}, in: {} };

    return {
        wallet_age_days: snapshot.wallet_age_days,
        activity_frequency: computeActivityFrequency(snapshot),
        burst_score: computeBurstScore(dailyTransferCounts)
    };
}

module.exports = {
    extractFeaturesFromSnapshot,
    computeActivityFrequency,
    computeBurstScore,
    mergeDailyCounts
};
