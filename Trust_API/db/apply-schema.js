const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

try {
    if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(path.join(__dirname, '..', '.env'));
    }
} catch (error) {
    if (error.code !== 'ENOENT') {
        throw error;
    }
}

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required to apply the database schema.');
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: String(process.env.DATABASE_SSL).toLowerCase() === 'true'
            ? { rejectUnauthorized: false }
            : false
    });

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    try {
        await pool.query(schemaSql);
        console.log('Database schema applied.');
    } finally {
        await pool.end();
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exit(1);
});
