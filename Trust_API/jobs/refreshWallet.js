const { extractFeatures } = require('../db/featureRepository');
const { scoreWallet } = require('../scoringService');
const { setCachedScore, invalidateCachedScore } = require('../scoreCache');

function toPublicScore(scoreResult) {
    return {
        wallet: scoreResult.wallet,
        trust_score: scoreResult.trust_score,
        trust_tier: scoreResult.trust_tier,
        human_likelihood: scoreResult.human_likelihood,
        confidence: scoreResult.confidence,
        risk_flags: scoreResult.risk_flags || [],
        features: scoreResult.features
    };
}

async function refreshWalletScore(wallet) {
    await invalidateCachedScore(wallet);
    await extractFeatures(wallet, true);
    const scored = await scoreWallet(wallet);
    const publicScore = toPublicScore(scored);
    await setCachedScore(wallet, publicScore);

    return publicScore;
}

module.exports = {
    refreshWalletScore,
    toPublicScore
};
