const path = require('path');
const { isDatabaseConfigured } = require('./db/client');
const { getFeatureById, getLatestFeaturesByWallet } = require('./db/featureRepository');
const { createError } = require('./middleware/errors');

const WEIGHTS = {
    age: 0.4,
    activity: 0.3,
    burst: 0.3
};

const TIER_THRESHOLDS = {
    gold: 75,
    silver: 50
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

function scoreToTier(trustScore) {
    if (trustScore >= TIER_THRESHOLDS.gold) {
        return 'gold';
    }

    if (trustScore >= TIER_THRESHOLDS.silver) {
        return 'silver';
    }

    return 'bronze';
}

function scoreToHumanLikelihood(trustScore) {
    if (trustScore >= 75) {
        return 'high';
    }

    if (trustScore >= 50) {
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

    const trustScore = (
        ageComponent * WEIGHTS.age +
        activityComponent * WEIGHTS.activity +
        burstComponent * WEIGHTS.burst
    ) * 100;

    const roundedScore = Number(trustScore.toFixed(1));

    return {
        trust_score: roundedScore,
        trust_tier: scoreToTier(roundedScore),
        human_likelihood: scoreToHumanLikelihood(roundedScore),
        confidence: computeConfidence(features),
        breakdown: {
            age: Number((ageComponent * WEIGHTS.age * 100).toFixed(1)),
            activity: Number((activityComponent * WEIGHTS.activity * 100).toFixed(1)),
            burst: Number((burstComponent * WEIGHTS.burst * 100).toFixed(1))
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
            burst_score: Number(feature.burst_score)
        },
        trust_score: score.trust_score,
        trust_tier: score.trust_tier,
        human_likelihood: score.human_likelihood,
        confidence: score.confidence,
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
    scoreWallet
};
