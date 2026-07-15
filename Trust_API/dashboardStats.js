const { isDatabaseConfigured } = require('./db/client');
const { getLatestFeaturesForAllWallets } = require('./db/featureRepository');
const { computeTrustScore } = require('./scoringService');
const { createError } = require('./middleware/errors');

async function scoreAllWallets() {
    if (!isDatabaseConfigured()) {
        throw createError(503, 'database not configured', 'DATABASE_NOT_CONFIGURED');
    }

    const features = await getLatestFeaturesForAllWallets();

    return features.map((feature) => {
        const score = computeTrustScore(feature);

        return {
            wallet: feature.wallet,
            trust_score: score.trust_score,
            trust_tier: score.trust_tier
        };
    });
}

async function getTierStats() {
    const scored = await scoreAllWallets();
    const tiers = {
        bronze: 0,
        silver: 0,
        gold: 0
    };

    for (const item of scored) {
        tiers[item.trust_tier] += 1;
    }

    return {
        total: scored.length,
        tiers
    };
}

async function getFlaggedWallets() {
    const scored = await scoreAllWallets();
    const wallets = scored.filter((item) => item.trust_tier === 'bronze');

    return {
        total: wallets.length,
        wallets
    };
}

module.exports = {
    getTierStats,
    getFlaggedWallets
};
