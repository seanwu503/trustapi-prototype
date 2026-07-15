const path = require('path');

process.loadEnvFile(path.join(__dirname, '..', '.env'));

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';
const API_KEY = process.env.API_KEY;

const WALLETS = [
    '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
    '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B'
];

async function callApi(route, wallet) {
    const response = await fetch(`${BASE_URL}${route}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
        },
        body: JSON.stringify({ wallet })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`${route} ${response.status}: ${data.error || 'request failed'}`);
    }

    return data;
}

async function simulateWallet(wallet) {
    console.log(`\n--- ${wallet} ---`);

    const check = await callApi('/check_wallet', wallet);
    console.log(`check_wallet:  tier=${check.trust_tier} score=${check.trust_score} likelihood=${check.human_likelihood}`);

    const proof = await callApi('/generate_proof', wallet);
    console.log(`generate_proof: proof_id=${proof.proof_id} expires=${proof.expires_at}`);
}

async function main() {
    if (!API_KEY) {
        console.error('API_KEY is not set in .env');
        process.exit(1);
    }

    console.log(`Simulating developer usage against ${BASE_URL}`);
    console.log(`Wallets: ${WALLETS.length}`);

    let failures = 0;

    for (const wallet of WALLETS) {
        try {
            await simulateWallet(wallet);
        } catch (error) {
            failures += 1;
            console.error(`FAILED ${wallet}: ${error.message}`);
        }
    }

    console.log(`\nDone. ${WALLETS.length - failures}/${WALLETS.length} succeeded.`);

    if (failures > 0) {
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
