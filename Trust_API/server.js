const express = require('express');
const path = require('path');
const { getWalletInfo, normalizeWallet } = require('./alchemyClient');
const { trySaveWalletSnapshot } = require('./db/walletRepository');
const { extractFeatures } = require('./db/featureRepository');
const { scoreWallet } = require('./scoringService');
const { asyncRoute } = require('./middleware/asyncRoute');
const { requireApiKey } = require('./middleware/auth');
const { sendError } = require('./middleware/errors');

process.loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.post('/check_wallet', requireApiKey, asyncRoute('check_wallet', async (req, res) => {
    const wallet = normalizeWallet(req.body.wallet);

    res.json({
        wallet,
        status: 'dummy',
        trust_score: 85.2,
        trust_tier: 'gold',
        human_likelihood: 'high',
        confidence: 1.0,
        features: {
            wallet_age_days: 847,
            activity_frequency: 8.47,
            burst_score: 2.3
        }
    });
}));

app.post('/generate_proof', requireApiKey, asyncRoute('generate_proof', async (req, res) => {
    const wallet = normalizeWallet(req.body.wallet);
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt);
    expiresAt.setDate(expiresAt.getDate() + 30);

    res.json({
        wallet,
        status: 'dummy',
        proof_id: '00000000-0000-0000-0000-000000000001',
        trust_score: 85.2,
        trust_tier: 'gold',
        human_likelihood: 'high',
        confidence: 1.0,
        issued_at: issuedAt.toISOString(),
        expires_at: expiresAt.toISOString()
    });
}));

app.post('/extract_features', asyncRoute('extract_features', async (req, res) => {
    const wallet = normalizeWallet(req.body.wallet);
    const refresh = Boolean(req.body.refresh);
    const result = await extractFeatures(wallet, refresh);

    res.json(result);
}));

app.post('/score_wallet', asyncRoute('score_wallet', async (req, res) => {
    const wallet = normalizeWallet(req.body.wallet);
    const result = await scoreWallet(wallet);

    res.json(result);
}));

app.post('/get_wallet_info', asyncRoute('get_wallet_info', async (req, res) => {
    const wallet = normalizeWallet(req.body.wallet);
    const result = await getWalletInfo(wallet);
    const saved = await trySaveWalletSnapshot(result);

    res.json({ ...result, ...saved });
}));

app.use((error, req, res, next) => {
    sendError(res, error, req.path);
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Open demo at http://localhost:${port}/demo.html`);
});
