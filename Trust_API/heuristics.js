const HIGH_BURST_THRESHOLD = 5;
const SHORT_LIFESPAN_DAYS = 30;
const CONTRACT_LOOP_RATIO = 0.7;
const CONTRACT_LOOP_MAX_DIVERSITY = 0.25;

const FLAG_PENALTIES = {
    high_burst: 8,
    short_lifespan: 10,
    contract_loop: 12
};

function getRiskFlags(features) {
    const flags = [];
    const burstScore = Number(features.burst_score);
    const activityFrequency = Number(features.activity_frequency);
    const contractRatio = Number(features.contract_interaction_ratio ?? 0);
    const diversity = Number(features.transaction_diversity ?? 0);
    const walletAgeDays = features.wallet_age_days;

    if (burstScore > HIGH_BURST_THRESHOLD) {
        flags.push('high_burst');
    }

    if (walletAgeDays === null || walletAgeDays === undefined || walletAgeDays < SHORT_LIFESPAN_DAYS) {
        flags.push('short_lifespan');
    }

    if (
        activityFrequency > 0 &&
        contractRatio >= CONTRACT_LOOP_RATIO &&
        diversity <= CONTRACT_LOOP_MAX_DIVERSITY
    ) {
        flags.push('contract_loop');
    }

    return flags;
}

function getRiskPenalty(riskFlags) {
    let penalty = 0;

    for (const flag of riskFlags) {
        penalty += FLAG_PENALTIES[flag] || 0;
    }

    return penalty;
}

module.exports = {
    getRiskFlags,
    getRiskPenalty,
    FLAG_PENALTIES,
    HIGH_BURST_THRESHOLD,
    SHORT_LIFESPAN_DAYS
};
