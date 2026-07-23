const path = require('path');
const { isDatabaseConfigured } = require('./db/client');
const { getFeatureById, getLatestFeaturesByWallet } = require('./db/featureRepository');
const { getRiskFlags, getRiskPenalty } = require('./heuristics');
const { createError } = require('./middleware/errors');

const WEIGHTS = {
    age: 0.25,
    activity: 0.15,
    burst: 0.2,
    diversity: 0.15,
    contract: 0.1,
    entropy: 0.15
};

const TIER_THRESHOLDS = {
    gold: 70,
    silver: 45
};

function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
}

function scoreAge(walletAgeDays) {
    if (walletAgeDays === null || walletAgeDays === undefined) {
        return 0;
    }

    return clamp(walletAgeDays / 365);
}

function scoreActivity(activityFrequency) {
    if (activityFrequency <= 0) {
        return 0.2;
    }

    if (activityFrequency <= 5) {
        return clamp(0.2 + (activityFrequency / 5) * 0.8);
    }

    if (activityFrequency <= 20) {
        return clamp(1 - ((activityFrequency - 5) / 15) * 0.5);
    }

    return clamp(0.5 - ((activityFrequency - 20) / 30) * 0.5);
}

function scoreBurst(burstScore) {
    return clamp(1 - burstScore / 10);
}

function scoreDiversity(transactionDiversity) {
    return clamp(Number(transactionDiversity) || 0);
}

function scoreContract(contractInteractionRatio) {
    // Heavy contract concentration looks less human/EOA-like.
    return clamp(1 - (Number(contractInteractionRatio) || 0));
}

function scoreEntropy(transactionEntropy) {
    return clamp(Number(transactionEntropy) || 0);
}

function scoreToTier(trustScore, riskFlags) {
    let tier;

    if (trustScore >= TIER_THRESHOLDS.gold) {
        tier = 'gold';
    } else if (trustScore >= TIER_THRESHOLDS.silver) {
        tier = 'silver';
    } else {
        tier = 'bronze';
    }

    // Flagged wallets cannot be gold.
    if (riskFlags.length > 0 && tier === 'gold') {
        return 'silver';
    }

    return tier;
}

function scoreToHumanLikelihood(trustScore, riskFlags) {
    if (riskFlags.length >= 2) {
        return 'low';
    }

    if (trustScore >= TIER_THRESHOLDS.gold) {
        return riskFlags.length > 0 ? 'medium' : 'high';
    }

    if (trustScore >= TIER_THRESHOLDS.silver) {
        return 'medium';
    }

    return 'low';
}

function computeConfidence(features) {
    let confidence = 1;

    if (features.wallet_age_days === null || features.wallet_age_days === undefined) {
        confidence -= 0.3;
    }

    if (features.activity_frequency === 0) {
        confidence -= 0.2;
    }

    return Number(clamp(confidence, 0.3, 1).toFixed(2));
}

function computeTrustScore(features) {
    const ageComponent = scoreAge(features.wallet_age_days);
    const activityComponent = scoreActivity(Number(features.activity_frequency));
    const burstComponent = scoreBurst(Number(features.burst_score));
    const diversityComponent = scoreDiversity(features.transaction_diversity);
    const contractComponent = scoreContract(features.contract_interaction_ratio);
    const entropyComponent = scoreEntropy(features.transaction_entropy);

    const rawScore = (
        ageComponent * WEIGHTS.age +
        activityComponent * WEIGHTS.activity +
        burstComponent * WEIGHTS.burst +
        diversityComponent * WEIGHTS.diversity +
        contractComponent * WEIGHTS.contract +
        entropyComponent * WEIGHTS.entropy
    ) * 100;

    const riskFlags = getRiskFlags(features);
    const penalty = getRiskPenalty(riskFlags);
    const roundedScore = Number(Math.max(0, Math.min(100, rawScore - penalty)).toFixed(1));

    return {
        trust_score: roundedScore,
        trust_tier: scoreToTier(roundedScore, riskFlags),
        human_likelihood: scoreToHumanLikelihood(roundedScore, riskFlags),
        confidence: computeConfidence(features),
        risk_flags: riskFlags,
        risk_penalty: penalty,
        breakdown: {
            age: Number((ageComponent * WEIGHTS.age * 100).toFixed(1)),
            activity: Number((activityComponent * WEIGHTS.activity * 100).toFixed(1)),
            burst: Number((burstComponent * WEIGHTS.burst * 100).toFixed(1)),
            diversity: Number((diversityComponent * WEIGHTS.diversity * 100).toFixed(1)),
            contract: Number((contractComponent * WEIGHTS.contract * 100).toFixed(1)),
            entropy: Number((entropyComponent * WEIGHTS.entropy * 100).toFixed(1)),
            risk_penalty: -penalty
        }
    };
}

function buildScoreResponse(feature, score) {
    return {
        wallet: feature.wallet,
        wallet_id: feature.wallet_id,
        feature_id: feature.feature_id,
        snapshot_id: feature.snapshot_id,
        features: {
            wallet_age_days: feature.wallet_age_days,
            activity_frequency: Number(feature.activity_frequency),
            burst_score: Number(feature.burst_score),
            transaction_diversity: Number(feature.transaction_diversity ?? 0),
            contract_interaction_ratio: Number(feature.contract_interaction_ratio ?? 0),
            transaction_entropy: Number(feature.transaction_entropy ?? 0),
            nft_transfer_count: Number(feature.nft_transfer_count ?? 0),
            nft_activity_ratio: Number(feature.nft_activity_ratio ?? 0)
        },
        trust_score: score.trust_score,
        trust_tier: score.trust_tier,
        human_likelihood: score.human_likelihood,
        confidence: score.confidence,
        risk_flags: score.risk_flags,
        breakdown: score.breakdown,
        snapshot_fetched_at: new Date(feature.snapshot_fetched_at).toISOString()
    };
}

function scoreFeatureRow(feature) {
    const score = computeTrustScore(feature);
    return buildScoreResponse(feature, score);
}

async function scoreWallet(wallet) {
    if (!isDatabaseConfigured()) {
        throw createError(503, 'database not configured', 'DATABASE_NOT_CONFIGURED');
    }

    const feature = await getLatestFeaturesByWallet(wallet);

    if (!feature) {
        throw createError(404, 'no features found — run /extract_features first', 'FEATURES_NOT_FOUND');
    }

    return scoreFeatureRow(feature);
}

async function scoreByFeatureId(featureId) {
    if (!isDatabaseConfigured()) {
        throw createError(503, 'database not configured', 'DATABASE_NOT_CONFIGURED');
    }

    const feature = await getFeatureById(featureId);

    if (!feature) {
        throw createError(404, `feature not found: ${featureId}`, 'FEATURE_NOT_FOUND');
    }

    return scoreFeatureRow(feature);
}

async function runCli() {
    process.loadEnvFile(path.join(__dirname, '.env'));

    const featureId = Number.parseInt(process.argv[2], 10);

    if (!Number.isInteger(featureId) || featureId <= 0) {
        console.error('Usage: node scoringService.js <feature_id>');
        console.error('   or: npm run score -- <feature_id>');
        process.exit(1);
    }

    if (!isDatabaseConfigured()) {
        console.error('DATABASE_URL is not set.');
        process.exit(1);
    }

    const result = await scoreByFeatureId(featureId);

    console.log(JSON.stringify(result, null, 2));
}

if (require.main === module) {
    runCli().catch((error) => {
        console.error(error.message);
        process.exit(1);
    });
}

module.exports = {
    scoreWallet,
    computeTrustScore
};
