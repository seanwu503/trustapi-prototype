const { getRedisConnection, isRedisConfigured } = require('./redisClient');
const { SCORE_CACHE_TTL_SECONDS } = require('./config');

const memoryCache = new Map();

function cacheKey(wallet) {
    return `score:${wallet}`;
}

function isExpired(entry) {
    return !entry || entry.expiresAt <= Date.now();
}

async function getCachedScore(wallet) {
    const key = cacheKey(wallet);

    if (isRedisConfigured()) {
        const redis = getRedisConnection();
        const raw = await redis.get(key);

        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            await redis.del(key);
            return null;
        }
    }

    const entry = memoryCache.get(key);

    if (isExpired(entry)) {
        memoryCache.delete(key);
        return null;
    }

    return entry.value;
}

async function setCachedScore(wallet, score) {
    const key = cacheKey(wallet);
    const payload = {
        ...score,
        cached_at: new Date().toISOString()
    };

    if (isRedisConfigured()) {
        const redis = getRedisConnection();
        await redis.set(key, JSON.stringify(payload), 'EX', SCORE_CACHE_TTL_SECONDS);
        return;
    }

    memoryCache.set(key, {
        value: payload,
        expiresAt: Date.now() + SCORE_CACHE_TTL_SECONDS * 1000
    });
}

async function invalidateCachedScore(wallet) {
    const key = cacheKey(wallet);

    if (isRedisConfigured()) {
        const redis = getRedisConnection();
        await redis.del(key);
        return;
    }

    memoryCache.delete(key);
}

module.exports = {
    getCachedScore,
    setCachedScore,
    invalidateCachedScore
};
