const express = require('express');
const path = require('path');
const { getWalletInfo, normalizeWallet } = require('./alchemyClient');
const { trySaveWalletSnapshot } = require('./db/walletRepository');
const { extractFeatures } = require('./db/featureRepository');

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

app.post('/extract_features', async (req, res) => {
    try {
        const wallet = normalizeWallet(req.body.wallet);
        const refresh = Boolean(req.body.refresh);
        const result = await extractFeatures(wallet, refresh);

        res.json(result);
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
