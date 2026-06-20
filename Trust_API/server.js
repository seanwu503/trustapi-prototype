const express = require('express');
const path = require('path');
const { getWalletInfo } = require('./alchemyClient');
const { trySaveWalletSnapshot } = require('./db/walletRepository');

process.loadEnvFile(path.join(__dirname, '.env'));

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

app.post('/check_wallet', (req, res) => {
    const wallet = req.body.wallet || '';

    res.json({
        wallet,
        status: 'success',
        human_likelihood: 'high',
        trust_tier: 'gold',
        confidence: 0.92,
        account_age_days: 847,
        activity_score: 8.7
    });
});

app.post('/get_wallet_info', async (req, res) => {
    try {
        const result = await getWalletInfo(req.body.wallet);
        const saved = await trySaveWalletSnapshot(result);
        res.json({ ...result, ...saved });
    } catch (error) {
        const status = error.statusCode || 500;
        const message = status === 500 ? 'internal server error' : error.message;

        if (status === 500) {
            console.error('get_wallet_info failed:', error.message);
        }

        res.status(status).json({ error: message });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Open demo at http://localhost:${port}/demo.html`);
});
