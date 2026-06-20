const express = require('express');
const path = require('path');

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

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Open demo at http://localhost:${port}/demo.html`);
});
