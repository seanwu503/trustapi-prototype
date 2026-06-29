const path = require('path');
const { isDatabaseConfigured, query } = require('./db/client');
const { computeTrustScore } = require('./scoringService');

process.loadEnvFile(path.join(__dirname, '.env'));

function printUsage() {
    console.error('Usage: node score-feature.js <feature_id>');
    console.error('   or: npm run score -- <feature_id>');
}

async function getFeatureById(featureId) {
    const result = await query(
        `
        select
            wf.id as feature_id,
            wf.wallet_id,
            wf.snapshot_id,
            wf.wallet_age_days,
            wf.activity_frequency,
            wf.burst_score,
            wf.computed_at,
            w.address as wallet
        from wallet_features wf
        join wallets w on w.id = wf.wallet_id
        where wf.id = $1
        `,
        [featureId]
    );

    return result.rows[0] || null;
}

async function main() {
    const featureId = Number.parseInt(process.argv[2], 10);

    if (!Number.isInteger(featureId) || featureId <= 0) {
        printUsage();
        process.exit(1);
    }

    if (!isDatabaseConfigured()) {
        console.error('DATABASE_URL is not set.');
        process.exit(1);
    }

    const feature = await getFeatureById(featureId);

    if (!feature) {
        console.error(`Feature not found: ${featureId}`);
        process.exit(1);
    }

    const score = computeTrustScore(feature);

    console.log(JSON.stringify({
        feature_id: feature.feature_id,
        wallet_id: feature.wallet_id,
        snapshot_id: feature.snapshot_id,
        wallet: feature.wallet,
        features: {
            wallet_age_days: feature.wallet_age_days,
            activity_frequency: Number(feature.activity_frequency),
            burst_score: Number(feature.burst_score)
        },
        score
    }, null, 2));
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
