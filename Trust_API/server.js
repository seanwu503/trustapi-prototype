const express = require('express');
const path = require('path');
const { getWalletInfo, normalizeWallet } = require('./alchemyClient');
const { trySaveWalletSnapshot } = require('./db/walletRepository');
const { extractFeatures } = require('./db/featureRepository');
const { scoreWallet } = require('./scoringService');
const { checkWallet } = require('./trustService');
const { generateProof } = require('./proofService');
const { getTierStats, getFlaggedWallets } = require('./dashboardStats');
const { startWorker } = require('./queue');
const { getMetrics } = require('./metrics');
const { asyncRoute } = require('./middleware/asyncRoute');
const { requireApiKey } = require('./middleware/auth');
const { sendError } = require('./middleware/errors');
const logger = require('./logger');

process.loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.post('/check_wallet', requireApiKey, asyncRoute('check_wallet', async (req, res) => {
    const wallet = normalizeWallet(req.body.wallet);
    const result = await checkWallet(wallet);
    res.json(result);
}));

app.post('/generate_proof', requireApiKey, asyncRoute('generate_proof', async (req, res) => {
    const wallet = normalizeWallet(req.body.wallet);
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

app.get('/internal/metrics', asyncRoute('metrics', async (req, res) => {
    res.json(getMetrics());
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

startWorker();

app.listen(port, () => {
    logger.info('server_started', { port });
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Open demo at http://localhost:${port}/demo.html`);
});
