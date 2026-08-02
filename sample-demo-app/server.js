const path = require('path');
const express = require('express');
const { TrustClient, TrustApiError } = require('@trustapi/sdk');

function loadEnv() {
    try {
        process.loadEnvFile(path.join(__dirname, '.env'));
    } catch (error) {
        // optional local .env
    }

    try {
        process.loadEnvFile(path.join(__dirname, '..', 'Trust_API', '.env'));
    } catch (error) {
        // optional shared Trust_API .env
    }
}

loadEnv();

const port = Number(process.env.PORT || 3001);
const apiKey = process.env.TRUST_API_KEY || process.env.API_KEY || '';
const baseUrl = process.env.TRUST_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:8000';

const EVENTS = [
    {
        id: 'summer-fest',
        name: 'Summer Music Fest',
        venue: 'Bayfront Arena',
        date: 'Sat, Aug 15 · 7:00 PM',
        price_eth: 0.02,
        description: 'General admission ticket'
    },
    {
        id: 'tech-summit',
        name: 'City Tech Summit',
        venue: 'Convention Center Hall B',
        date: 'Fri, Sep 4 · 9:00 AM',
        price_eth: 0.015,
        description: 'One-day conference pass'
    }
];

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getTrustClient() {
    if (!apiKey) {
        const error = new Error('TRUST_API_KEY (or API_KEY) is not configured');
        error.statusCode = 503;
        throw error;
    }

    return new TrustClient({ apiKey, baseUrl });
}

function decideCheckout(trustResult) {
    const tier = trustResult.trust_tier;
    const flags = Array.isArray(trustResult.risk_flags) ? trustResult.risk_flags : [];

    if (flags.length > 0) {
        return {
            allowed: false,
            reason: `Wallet blocked due to risk flags: ${flags.join(', ')}`
        };
    }

    if (tier === 'bronze') {
        return {
            allowed: false,
            reason: 'Wallet trust tier is bronze — too low for ticket checkout'
        };
    }

    if (tier === 'silver' || tier === 'gold') {
        return {
            allowed: true,
            reason: `Wallet trusted (${tier}) — ticket purchase allowed`
        };
    }

    return {
        allowed: false,
        reason: 'Unable to determine wallet trust tier'
    };
}

app.get('/api/events', (req, res) => {
    res.json({ events: EVENTS });
});

app.post('/api/checkout', async (req, res) => {
    try {
        const eventId = req.body && req.body.eventId;
        const wallet = req.body && req.body.wallet;
        const quantity = Number(req.body && req.body.quantity);

        const event = EVENTS.find((item) => item.id === eventId);

        if (!event) {
            return res.status(400).json({ error: 'Choose a valid event ticket' });
        }

        if (!Number.isInteger(quantity) || quantity < 1 || quantity > 6) {
            return res.status(400).json({ error: 'Quantity must be between 1 and 6' });
        }

        const trust = getTrustClient();
        const trustResult = await trust.checkWallet(wallet);
        const decision = decideCheckout(trustResult);
        const totalEth = Number((event.price_eth * quantity).toFixed(4));

        if (!decision.allowed) {
            return res.status(403).json({
                allowed: false,
                reason: decision.reason,
                event,
                quantity,
                total_eth: totalEth,
                wallet: trustResult.wallet,
                trust: {
                    trust_score: trustResult.trust_score,
                    trust_tier: trustResult.trust_tier,
                    risk_flags: trustResult.risk_flags || []
                }
            });
        }

        return res.json({
            allowed: true,
            reason: decision.reason,
            message: 'Payment accepted with digital wallet. Your tickets are confirmed.',
            order_id: `TKT-${Date.now().toString(36).toUpperCase()}`,
            event,
            quantity,
            total_eth: totalEth,
            wallet: trustResult.wallet,
            trust: {
                trust_score: trustResult.trust_score,
                trust_tier: trustResult.trust_tier,
                risk_flags: trustResult.risk_flags || []
            }
        });
    } catch (error) {
        if (error instanceof TrustApiError) {
            return res.status(error.status || 502).json({
                allowed: false,
                error: error.message,
                code: error.code
            });
        }

        return res.status(error.statusCode || 500).json({
            allowed: false,
            error: error.message || 'Checkout failed'
        });
    }
});

app.listen(port, () => {
    console.log(`Ticket demo running on http://localhost:${port}`);
    console.log(`TrustAPI base URL: ${baseUrl}`);
});
