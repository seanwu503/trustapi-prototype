const { getLatestFeaturesByWallet } = require('./db/featureRepository');
const { scoreWallet } = require('./scoringService');
const { getCachedScore, setCachedScore } = require('./scoreCache');
const { enqueueWalletRefresh } = require('./queue');
const { toPublicScore } = require('./jobs/refreshWallet');
const { FEATURE_TTL_MS } = require('./config');
const { recordCacheHit, recordCacheMiss } = require('./metrics');

function isFeatureStale(feature) {
    if (!feature) {
        return true;
    }

    const computedAt = new Date(feature.feature_computed_at).getTime();
    return Number.isNaN(computedAt) || computedAt < Date.now() - FEATURE_TTL_MS;
}

async function checkWallet(wallet) {
    const cached = await getCachedScore(wallet);

    if (cached) {
        recordCacheHit();
        const feature = await getLatestFeaturesByWallet(wallet);

        if (isFeatureStale(feature)) {
            const queued = await enqueueWalletRefresh(wallet, { wait: false });
            return {
                ...cached,
                cached: true,
                refresh_queued: true,
                job_id: queued.job_id
            };
        }

        return {
            ...cached,
            cached: true,
            refresh_queued: false
        };
    }

    recordCacheMiss();
    const feature = await getLatestFeaturesByWallet(wallet);

    if (feature && !isFeatureStale(feature)) {
        const scored = toPublicScore(await scoreWallet(wallet));
        await setCachedScore(wallet, scored);

        return {
            ...scored,
            cached: false,
            refresh_queued: false
        };
    }

    if (feature && isFeatureStale(feature)) {
        const scored = toPublicScore(await scoreWallet(wallet));
        await setCachedScore(wallet, scored);
        const queued = await enqueueWalletRefresh(wallet, { wait: false });

        return {
            ...scored,
            cached: false,
            refresh_queued: true,
            job_id: queued.job_id
        };
    }

    // No features yet — wait for first refresh so the caller still gets a score.
    const queued = await enqueueWalletRefresh(wallet, { wait: true });
    const scored = queued.result || toPublicScore(await scoreWallet(wallet));

    return {
        ...scored,
        cached: false,
        refresh_queued: false,
        job_id: queued.job_id
    };
}

module.exports = {
    checkWallet
};
