const startedAt = Date.now();

const counters = {
    requests_total: 0,
    request_errors_total: 0,
    cache_hits_total: 0,
    cache_misses_total: 0,
    refresh_queued_total: 0,
    refresh_completed_total: 0,
    refresh_failed_total: 0,
    refresh_retries_total: 0
};

const latencyMs = [];
const MAX_LATENCY_SAMPLES = 1000;

function observeLatency(ms) {
    latencyMs.push(ms);

    if (latencyMs.length > MAX_LATENCY_SAMPLES) {
        latencyMs.shift();
    }
}

function percentile(sorted, p) {
    if (sorted.length === 0) {
        return null;
    }

    const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[index];
}

function recordRequest({ route, statusCode, durationMs, error: hadError }) {
    counters.requests_total += 1;

    if (hadError || statusCode >= 500) {
        counters.request_errors_total += 1;
    }

    if (typeof durationMs === 'number') {
        observeLatency(durationMs);
    }

    return {
        route,
        statusCode,
        durationMs
    };
}

function recordCacheHit() {
    counters.cache_hits_total += 1;
}

function recordCacheMiss() {
    counters.cache_misses_total += 1;
}

function recordRefreshQueued() {
    counters.refresh_queued_total += 1;
}

function recordRefreshCompleted() {
    counters.refresh_completed_total += 1;
}

function recordRefreshFailed() {
    counters.refresh_failed_total += 1;
}

function recordRefreshRetry() {
    counters.refresh_retries_total += 1;
}

function getMetrics() {
    const sorted = [...latencyMs].sort((a, b) => a - b);

    return {
        uptime_seconds: Math.round((Date.now() - startedAt) / 1000),
        ...counters,
        request_latency_ms: {
            count: sorted.length,
            p50: percentile(sorted, 50),
            p95: percentile(sorted, 95),
            max: sorted.length ? sorted[sorted.length - 1] : null
        }
    };
}

module.exports = {
    recordRequest,
    recordCacheHit,
    recordCacheMiss,
    recordRefreshQueued,
    recordRefreshCompleted,
    recordRefreshFailed,
    recordRefreshRetry,
    getMetrics
};
