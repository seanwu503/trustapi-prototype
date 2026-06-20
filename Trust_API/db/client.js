const { Pool } = require('pg');

let pool;

function isDatabaseConfigured() {
    return Boolean(process.env.DATABASE_URL);
}

function getPool() {
    if (!isDatabaseConfigured()) {
        return null;
    }

    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL
        });
    }

    return pool;
}

async function query(text, params) {
    const activePool = getPool();

    if (!activePool) {
        throw new Error('database not configured');
    }

    return activePool.query(text, params);
}

module.exports = {
    isDatabaseConfigured,
    query
};
