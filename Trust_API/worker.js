const path = require('path');
const { startWorker, closeQueue } = require('./queue');
const { closeRedis } = require('./redisClient');

process.loadEnvFile(path.join(__dirname, '.env'));

startWorker();

async function shutdown() {
    await closeQueue();
    await closeRedis();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('[worker] listening for wallet refresh jobs');
