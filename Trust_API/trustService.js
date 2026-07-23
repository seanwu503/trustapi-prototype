const { ensureFeaturesReady } = require('./db/featureRepository');
const { scoreWallet } = require('./scoringService');

function toCheckWalletResponse(scoreResult) {
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

async function checkWallet(wallet) {
    await ensureFeaturesReady(wallet);

    const result = await scoreWallet(wallet);

    return toCheckWalletResponse(result);
}

module.exports = {
    checkWallet
};
