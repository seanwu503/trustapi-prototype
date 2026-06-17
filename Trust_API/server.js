const express = require('express');
const path = require('path');

try {
    if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(path.join(__dirname, '.env'));
    }
} catch (error) {
    if (error.code !== 'ENOENT') {
        throw error;
    }
}

const { isDatabaseConfigured, query } = require('./db/client');
const { ingestWallet } = require('./services/walletIngestionService');

const app = express();
const port = process.env.PORT || 8000;
const corsAllowedOrigin = process.env.CORS_ALLOWED_ORIGIN || '*';

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', corsAllowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

app.use(express.json());

app.get('/', (req, res) => {
    res.send('TrustAPI server is running. Use POST /check_wallet to get the dummy JSON response.');
});

app.get('/health', async (req, res) => {
    let database = 'not_configured';

    if (isDatabaseConfigured()) {
        try {
            await query('select 1');
            database = 'ok';
        } catch (error) {
            database = 'error';
        }
    }

    res.json({
        status: 'ok',
        service: 'trust-api',
        database: database,
        uptime_seconds: Math.round(process.uptime())
    });
});

app.post('/check_wallet', async (req, res) => {
    const wallet = req.body.wallet;
    const result = {
        wallet: wallet,
        status: "success",
        human_likelihood: "unknown",
        trust_tier: "unknown"
    };

    if (isDatabaseConfigured()) {
        try {
            await query(
                `
                insert into wallet_checks (wallet, status, human_likelihood, trust_tier)
                values ($1, $2, $3, $4)
                `,
                [result.wallet, result.status, result.human_likelihood, result.trust_tier]
            );
        } catch (error) {
            console.error('Failed to save wallet check:', error.message);
        }
    }

    res.json(result);
});

app.post('/wallets/ingest', async (req, res) => {
    try {
        const result = await ingestWallet(req.body);
        res.json(result);
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                status: 'error',
                code: error.code,
                message: error.message
            });
        }

        console.error('Unexpected wallet ingestion error:', error.message);
        res.status(500).json({
            status: 'error',
            code: 'internal_error',
            message: 'wallet ingestion failed'
        });
    }
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

module.exports = app;
