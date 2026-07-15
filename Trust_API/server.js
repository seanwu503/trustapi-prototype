const express = require('express');
const path = require('path');
const { getWalletInfo, normalizeWallet } = require('./alchemyClient');
const { trySaveWalletSnapshot } = require('./db/walletRepository');
const { extractFeatures, getLatestFeaturesByWallet } = require('./db/featureRepository');
const { scoreWallet } = require('./scoringService');
const { checkWallet } = require('./trustService');
const { generateProof } = require('./proofService');
const { getTierStats, getFlaggedWallets } = require('./dashboardStats');
const { asyncRoute } = require('./middleware/asyncRoute');
const { requireApiKey } = require('./middleware/auth');
const { sendError } = require('./middleware/errors');

process.loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const port = process.env.PORT || 8000;
const FEATURE_TTL = 7 * 24 * 60 * 60 * 1000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.post('/check_wallet', requireApiKey, asyncRoute('check_wallet', async (req, res) => {
    const wallet = normalizeWallet(req.body.wallet);

    let feature = await getLatestFeaturesByWallet(wallet);

    // if feature is null or feature.computed_at is older than 7 days, then we need to repull everything
    if (feature === null || feature.feature_computed_at < Date.now() - FEATURE_TTL) {
        await extractFeatures(wallet, true);
    }

    const result = await checkWallet(wallet);
    res.json(result);
}));

app.post('/generate_proof', requireApiKey, asyncRoute('generate_proof', async (req, res) => {
    const wallet = normalizeWallet(req.body.wallet);
    let feature = await getLatestFeaturesByWallet(wallet);
    if (feature === null || feature.feature_computed_at < Date.now() - 7 * 24 * 60 * 60 * 1000) {
        await extractFeatures(wallet, true);
    }
    const result = await generateProof(wallet);
    res.json(result);
}));

app.get('/internal/tier_stats', asyncRoute('tier_stats', async (req, res) => {
    const result = await getTierStats();
    res.json(result);
}));

app.get('/internal/flagged_wallets', asyncRoute('flagged_wallets', async (req, res) => {
    const result = await getFlaggedWallets();
    res.json(result);
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
