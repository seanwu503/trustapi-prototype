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

const app = express();
const port = process.env.PORT || 8000;

app.use(express.json());

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

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

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
