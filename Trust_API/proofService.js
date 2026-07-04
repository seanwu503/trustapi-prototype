const crypto = require('crypto');
const { ensureFeaturesReady } = require('./db/featureRepository');
const { scoreWallet } = require('./scoringService');

const PROOF_TTL_DAYS = 30;

async function generateProof(wallet) {
    await ensureFeaturesReady(wallet);

    const score = await scoreWallet(wallet);
    const issuedAt = new Date(score.snapshot_fetched_at);
    const expiresAt = new Date(issuedAt);
    expiresAt.setDate(expiresAt.getDate() + PROOF_TTL_DAYS);

    return {
        proof_id: crypto.randomUUID(),
        wallet: score.wallet,
        trust_score: score.trust_score,
        trust_tier: score.trust_tier,
        human_likelihood: score.human_likelihood,
        confidence: score.confidence,
        features: score.features,
        issued_at: issuedAt.toISOString(),
        expires_at: expiresAt.toISOString()
    };
}

module.exports = {
    generateProof
};
