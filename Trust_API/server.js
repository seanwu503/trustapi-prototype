const express = require('express');
const path = require('path');
const { getWalletInfo, normalizeWallet } = require('./alchemyClient');
const { trySaveWalletSnapshot } = require('./db/walletRepository');
const { extractFeatures } = require('./db/featureRepository');
const { scoreWallet } = require('./scoringService');
const { asyncRoute } = require('./middleware/asyncRoute');

process.loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

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

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Open demo at http://localhost:${port}/demo.html`);
});
