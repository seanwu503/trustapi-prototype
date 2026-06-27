const express = require('express');
const path = require('path');
const { getWalletInfo, normalizeWallet } = require('./alchemyClient');
const { trySaveWalletSnapshot } = require('./db/walletRepository');

process.loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

function handleApiError(res, error, routeName) {
    const status = error.statusCode || 500;
    const message = status === 500 ? 'internal server error' : error.message;

    if (status === 500) {
        console.error(`${routeName} failed:`, error.message);
    }

    res.status(status).json({ error: message });
}

app.post('/check_wallet', (req, res) => {
    try {
        const wallet = normalizeWallet(req.body.wallet);

        res.json({
            wallet,
            status: 'success',
            human_likelihood: 'high',
            trust_tier: 'gold',
            confidence: 0.92,
            account_age_days: 847,
            activity_score: 8.7
        });
    } catch (error) {
        handleApiError(res, error, 'check_wallet');
    }
});

app.post('/extract_features', (req, res) => {
    try {
        const wallet = normalizeWallet(req.body.wallet);
        const refresh = Boolean(req.body.refresh);

        res.json({
            wallet,
            refresh,
            status: 'dummy',
            wallet_id: 1,
            snapshot_id: 5,
            feature_id: 2,
            wallet_age_days: 847,
            activity_frequency: 8.47,
            burst_score: 2.3,
            computed_at: new Date().toISOString()
        });
    } catch (error) {
        handleApiError(res, error, 'extract_features');
    }
});

app.post('/get_wallet_info', async (req, res) => {
    try {
        const wallet = normalizeWallet(req.body.wallet);
        const result = await getWalletInfo(wallet);
        const saved = await trySaveWalletSnapshot(result);
        res.json({ ...result, ...saved });
    } catch (error) {
        handleApiError(res, error, 'get_wallet_info');
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Open demo at http://localhost:${port}/demo.html`);
});
