const test = require('node:test');
const assert = require('node:assert/strict');
const { Readable, Writable } = require('node:stream');
const app = require('../server');

test.before(() => {
    process.env.DATABASE_URL = '';
    process.env.BLOCKCHAIN_PROVIDER_URL = '';
    process.env.BLOCKCHAIN_API_KEY = '';
});

function requestApp({ method, path, body }) {
    const requestBody = body === undefined ? '' : JSON.stringify(body);
    const req = new Readable({
        read() {
            this.push(requestBody);
            this.push(null);
        }
    });

    req.method = method;
    req.url = path;
    req.headers = {};

    if (requestBody) {
        req.headers['content-type'] = 'application/json';
        req.headers['content-length'] = Buffer.byteLength(requestBody);
    }

    return new Promise((resolve, reject) => {
        const chunks = [];
        const headers = {};
        const res = new Writable({
            write(chunk, encoding, callback) {
                chunks.push(Buffer.from(chunk));
                callback();
            }
        });

        res.statusCode = 200;
        res.setHeader = (name, value) => {
            headers[name.toLowerCase()] = value;
        };
        res.getHeader = (name) => headers[name.toLowerCase()];
        res.getHeaders = () => ({ ...headers });
        res.removeHeader = (name) => {
            delete headers[name.toLowerCase()];
        };
        res.end = (chunk) => {
            if (chunk) {
                chunks.push(Buffer.from(chunk));
            }

            const text = Buffer.concat(chunks).toString('utf8');
            resolve({
                status: res.statusCode,
                headers,
                text,
                body: text ? JSON.parse(text) : null
            });
        };

        app.handle(req, res, reject);
    });
}

async function postJson(path, body) {
    return requestApp({ method: 'POST', path, body });
}

test('GET /health returns service status', async () => {
    const response = await requestApp({ method: 'GET', path: '/health' });

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(response.body.service, 'trust-api');
    assert.equal(response.body.database, 'not_configured');
    assert.equal(typeof response.body.uptime_seconds, 'number');
});

test('POST /wallets/ingest returns ingested wallet response', async () => {
    const response = await postJson('/wallets/ingest', {
        wallet: ' 0x123 ',
        chain: 'Ethereum'
    });

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
        wallet: '0x123',
        chain: 'ethereum',
        status: 'ingested',
        source: 'manual',
        database: 'not_configured',
        blockchain: {
            status: 'not_configured',
            provider: 'none',
            transaction_count: null
        },
        message: 'Wallet ingestion completed.'
    });
});

test('POST /wallets/ingest returns 400 when wallet is missing', async () => {
    const response = await postJson('/wallets/ingest', {
        chain: 'ethereum'
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
        status: 'error',
        code: 'missing_wallet',
        message: 'wallet is required'
    });
});

test('POST /wallets/ingest returns 400 when chain is missing', async () => {
    const response = await postJson('/wallets/ingest', {
        wallet: '0x123'
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
        status: 'error',
        code: 'missing_chain',
        message: 'chain is required'
    });
});
