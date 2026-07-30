const path = require('path');

process.loadEnvFile(path.join(__dirname, '..', '.env'));

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY;
const ROUNDS = Number(process.env.BENCH_ROUNDS || 5);

const WALLETS = [
    '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
    '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
];

async function checkWallet(wallet) {
    const started = Date.now();
    const response = await fetch(`${BASE_URL}/check_wallet`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
        },
        body: JSON.stringify({ wallet })
    });

    const data = await response.json();
    const durationMs = Date.now() - started;

    if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
    }

    return {
        wallet,
        durationMs,
        cached: Boolean(data.cached),
        trust_score: data.trust_score
    };
}

function percentile(sorted, p) {
    if (sorted.length === 0) {
        return null;
    }

    const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
    return sorted[index];
}

function summarize(label, samples) {
    const durations = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
    const cacheHits = samples.filter((sample) => sample.cached).length;

    return {
        label,
        count: samples.length,
        cache_hits: cacheHits,
        cache_hit_rate: Number((cacheHits / samples.length).toFixed(2)),
        p50_ms: percentile(durations, 50),
        p95_ms: percentile(durations, 95),
        max_ms: durations[durations.length - 1],
        avg_ms: Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1))
    };
}

async function runPass(label) {
    const samples = [];

    for (let round = 0; round < ROUNDS; round += 1) {
        for (const wallet of WALLETS) {
            samples.push(await checkWallet(wallet));
        }
    }

    return summarize(label, samples);
}

async function main() {
    if (!API_KEY) {
        console.error('API_KEY is not set in .env');
        process.exit(1);
    }

    console.log(`Benchmarking ${BASE_URL}`);
    console.log(`Wallets=${WALLETS.length} rounds=${ROUNDS}`);

    const cold = await runPass('cold_or_mixed');
    const warm = await runPass('warm_cache');

    console.log(JSON.stringify({ cold, warm }, null, 2));

    const metricsResponse = await fetch(`${BASE_URL}/internal/metrics`);
    const metrics = await metricsResponse.json();
    console.log('\nServer metrics snapshot:');
    console.log(JSON.stringify(metrics, null, 2));
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
