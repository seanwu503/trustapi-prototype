const path = require('path');
const { normalizeWallet } = require('./alchemyClient');
const { isDatabaseConfigured } = require('./db/client');
const { deleteWalletByAddress } = require('./db/walletRepository');

process.loadEnvFile(path.join(__dirname, '.env'));

function printUsage() {
    console.error('Usage: node delete-wallet.js <wallet_address>');
    console.error('   or: npm run delete-wallet -- <wallet_address>');
}

async function main() {
    const addressInput = process.argv[2];

    if (!addressInput) {
        printUsage();
        process.exit(1);
    }

    if (!isDatabaseConfigured()) {
        console.error('DATABASE_URL is not set.');
        process.exit(1);
    }

    const address = normalizeWallet(addressInput);
    const deleted = await deleteWalletByAddress(address);

    if (!deleted) {
        console.error(`Wallet not found: ${address}`);
        process.exit(1);
    }

    console.log(JSON.stringify({
        deleted: true,
        wallet_id: deleted.id,
        address: deleted.address,
        chain: deleted.chain,
        snapshots_deleted: deleted.snapshots_deleted,
        features_deleted: deleted.features_deleted
    }, null, 2));
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
