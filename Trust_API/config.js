const SCORE_CACHE_TTL_SECONDS = Number(process.env.SCORE_CACHE_TTL_SECONDS || 3600);
const FEATURE_TTL_MS = Number(process.env.FEATURE_TTL_MS || 7 * 24 * 60 * 60 * 1000);
const REDIS_URL = process.env.REDIS_URL || '';

function isRedisConfigured() {
    return Boolean(REDIS_URL);
}

module.exports = {
    SCORE_CACHE_TTL_SECONDS,
    FEATURE_TTL_MS,
    REDIS_URL,
    isRedisConfigured
};
