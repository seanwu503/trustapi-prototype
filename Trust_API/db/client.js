const { Pool } = require('pg');

let pool;

function isDatabaseConfigured() {
    return Boolean(process.env.DATABASE_URL);
}

function getSslConfig() {
    return String(process.env.DATABASE_SSL).toLowerCase() === 'true'
        ? { rejectUnauthorized: false }
        : false;
}

function getPool() {
    if (!isDatabaseConfigured()) {
        return null;
    }

    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: getSslConfig()
        });
    }

    return pool;
}

async function query(text, params) {
    const activePool = getPool();

    if (!activePool) {
        return null;
    }

    return activePool.query(text, params);
}

module.exports = {
    getPool,
    isDatabaseConfigured,
    query
};
