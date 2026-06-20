const express = require('express');
const path = require('path');
const { getWalletInfo } = require('./alchemyClient');

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
        console.log('get_wallet_info request received:', req.body.wallet);
        const result = await getWalletInfo(req.body.wallet);
        res.json(result);
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }

        console.error('get_wallet_info failed:', error.message);
        res.status(500).json({ error: 'internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Open demo at http://localhost:${port}/demo.html`);
});
