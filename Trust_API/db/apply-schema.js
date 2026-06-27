const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

process.loadEnvFile(path.join(__dirname, '..', '.env'));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not set. Copy .env.example to .env and configure it.');
    process.exit(1);
}

const schemaPath = path.join(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');

async function main() {
    const pool = new Pool({ connectionString });

    try {
        await pool.query(schemaSql);
        console.log('Schema applied successfully from db/schema.sql');
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error('Failed to apply schema:', error.message);
    process.exit(1);
});
