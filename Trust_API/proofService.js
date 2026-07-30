const crypto = require('crypto');
const { getLatestFeaturesByWallet } = require('./db/featureRepository');
const { scoreWallet } = require('./scoringService');
const { setCachedScore } = require('./scoreCache');
const { enqueueWalletRefresh } = require('./queue');
const { toPublicScore } = require('./jobs/refreshWallet');
const { FEATURE_TTL_MS } = require('./config');

const PROOF_TTL_DAYS = 30;

function isFeatureStale(feature) {
    if (!feature) {
        return true;
    }

    const computedAt = new Date(feature.feature_computed_at).getTime();
    return Number.isNaN(computedAt) || computedAt < Date.now() - FEATURE_TTL_MS;
}

async function generateProof(wallet) {
    const feature = await getLatestFeaturesByWallet(wallet);

    if (!feature || isFeatureStale(feature)) {
        await enqueueWalletRefresh(wallet, { wait: true });
    }

    const full = await scoreWallet(wallet);
    const score = toPublicScore(full);
    await setCachedScore(wallet, score);

    const issuedAt = new Date(full.snapshot_fetched_at);
    const expiresAt = new Date(issuedAt);
    expiresAt.setDate(expiresAt.getDate() + PROOF_TTL_DAYS);

    return {
        proof_id: crypto.randomUUID(),
        wallet: score.wallet,
        trust_score: score.trust_score,
        trust_tier: score.trust_tier,
        human_likelihood: score.human_likelihood,
        confidence: score.confidence,
        risk_flags: score.risk_flags || [],
        features: score.features,
        issued_at: issuedAt.toISOString(),
        expires_at: expiresAt.toISOString()
    };
}

module.exports = {
    generateProof
};
