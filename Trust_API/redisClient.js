const IORedis = require('ioredis');
const { REDIS_URL, isRedisConfigured } = require('./config');

let sharedConnection = null;

function getRedisConnection() {
    if (!isRedisConfigured()) {
        return null;
    }

    if (!sharedConnection) {
        sharedConnection = new IORedis(REDIS_URL, {
            maxRetriesPerRequest: null
        });

        sharedConnection.on('error', (error) => {
            console.error('[redis]', error.message);
        });
    }

    return sharedConnection;
}

async function closeRedis() {
    if (sharedConnection) {
        await sharedConnection.quit();
        sharedConnection = null;
    }
}

module.exports = {
    getRedisConnection,
    closeRedis,
    isRedisConfigured
};
