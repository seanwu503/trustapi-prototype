#!/usr/bin/env node

const path = require('path');
const { TrustClient, TrustApiError } = require('../src');

function loadEnv() {
    const envPath = path.join(__dirname, '..', '..', 'Trust_API', '.env');

    try {
        process.loadEnvFile(envPath);
    } catch (error) {
        // Optional — caller can export TRUST_API_KEY / API_KEY instead.
    }
}

function printUsage() {
    console.error('Usage: npm run check -- <wallet> [--proof]');
    console.error('Example: npm run check -- 0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
}

async function main() {
    loadEnv();

    const args = process.argv.slice(2).filter((arg) => arg !== '--');
    const wantProof = args.includes('--proof');
    const wallet = args.find((arg) => !arg.startsWith('--'));

    if (!wallet) {
        printUsage();
        process.exit(1);
    }

    const apiKey = process.env.TRUST_API_KEY || process.env.API_KEY;
    const baseUrl = process.env.TRUST_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:8000';

    if (!apiKey) {
        console.error('Set TRUST_API_KEY or API_KEY (or use Trust_API/.env)');
        process.exit(1);
    }

    const trust = new TrustClient({ apiKey, baseUrl });

    console.log(`Calling TrustAPI at ${baseUrl}`);
    console.log(`Wallet: ${wallet}\n`);

    const result = await trust.checkWallet(wallet);
    console.log('checkWallet:');
    console.log(JSON.stringify(result, null, 2));

    if (wantProof) {
        const proof = await trust.generateProof(wallet);
        console.log('\ngenerateProof:');
        console.log(JSON.stringify(proof, null, 2));
    }
}

main().catch((error) => {
    if (error instanceof TrustApiError) {
        console.error(`TrustApiError [${error.code}] status=${error.status}: ${error.message}`);
        process.exit(1);
    }

    console.error(error.message);
    process.exit(1);
});
