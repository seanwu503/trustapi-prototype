const express = require('express');

const app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
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

app.post('/check_wallet', (req, res) => {
    const wallet = req.body.wallet;

    res.json({
        wallet: wallet,
        status: "success",
        human_likelihood: "unknown",
        trust_tier: "unknown"
    });
});

app.listen(8000, () => {
    console.log("Server running on port 8000");
});
