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

module.exports = {
    computeTrustScore,
    scoreAge,
    scoreActivity,
    scoreBurst
};
