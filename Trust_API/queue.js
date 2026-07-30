const { Queue, Worker } = require('bullmq');
const { getRedisConnection, isRedisConfigured } = require('./redisClient');
const { refreshWalletScore } = require('./jobs/refreshWallet');
const { withRetries } = require('./retry');
const {
    recordRefreshQueued,
    recordRefreshCompleted,
    recordRefreshFailed,
    recordRefreshRetry
} = require('./metrics');
const logger = require('./logger');

const QUEUE_NAME = 'wallet-refresh';
const memoryPending = new Map();
const REFRESH_ATTEMPTS = 3;

let queue = null;
let worker = null;

function getQueue() {
    if (!isRedisConfigured()) {
        return null;
    }

    if (!queue) {
        queue = new Queue(QUEUE_NAME, {
            connection: getRedisConnection()
        });
    }

    return queue;
}

async function runRefreshWithRetries(wallet) {
    return withRetries(
        () => refreshWalletScore(wallet),
        {
            attempts: REFRESH_ATTEMPTS,
            delayMs: 1000,
            onRetry: (error, attempt) => {
                recordRefreshRetry();
                logger.warn('refresh_retry', {
                    wallet,
                    attempt,
                    error: error.message
                });
            }
        }
    );
}

async function runMemoryJob(wallet) {
    if (memoryPending.has(wallet)) {
        return memoryPending.get(wallet);
    }

    const promise = runRefreshWithRetries(wallet)
        .then((result) => {
            recordRefreshCompleted();
            logger.info('refresh_completed', { wallet, mode: 'memory' });
            return result;
        })
        .catch((error) => {
            recordRefreshFailed();
            logger.error('refresh_failed', { wallet, mode: 'memory', error: error.message });
            throw error;
        })
        .finally(() => {
            memoryPending.delete(wallet);
        });

    memoryPending.set(wallet, promise);
    return promise;
}

async function waitForBullJob(job, timeoutMs) {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
        const state = await job.getState();

        if (state === 'completed') {
            return job.returnvalue;
        }

        if (state === 'failed') {
            throw new Error(job.failedReason || 'wallet refresh failed');
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
    }

    throw new Error('timed out waiting for wallet refresh');
}

async function enqueueWalletRefresh(wallet, { wait = false } = {}) {
    recordRefreshQueued();
    logger.info('refresh_queued', { wallet, wait, redis: isRedisConfigured() });

    if (!isRedisConfigured()) {
        if (wait) {
            const result = await runMemoryJob(wallet);
            return { mode: 'memory', waited: true, result };
        }

        runMemoryJob(wallet).catch(() => {
            // error already logged/metered in runMemoryJob
        });

        return { mode: 'memory', queued: true, job_id: `memory:${wallet}` };
    }

    const q = getQueue();
    let job;

    try {
        job = await q.add(
            'refresh',
            { wallet },
            {
                jobId: `refresh:${wallet}`,
                removeOnComplete: true,
                removeOnFail: true,
                attempts: REFRESH_ATTEMPTS,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            }
        );
    } catch (error) {
        job = await q.getJob(`refresh:${wallet}`);

        if (!job) {
            recordRefreshFailed();
            logger.error('refresh_enqueue_failed', { wallet, error: error.message });
            throw error;
        }
    }

    if (!wait) {
        return { mode: 'redis', queued: true, job_id: String(job.id) };
    }

    try {
        const result = await waitForBullJob(job, 120000);
        logger.info('refresh_wait_finished', { wallet, mode: 'redis', job_id: String(job.id) });
        return { mode: 'redis', waited: true, result, job_id: String(job.id) };
    } catch (error) {
        logger.error('refresh_wait_failed', { wallet, mode: 'redis', error: error.message });
        throw error;
    }
}

function startWorker() {
    if (!isRedisConfigured()) {
        logger.info('worker_mode', { mode: 'memory' });
        return null;
    }

    if (worker) {
        return worker;
    }

    worker = new Worker(
        QUEUE_NAME,
        async (job) => {
            const wallet = job.data.wallet;
            logger.info('refresh_started', { wallet, mode: 'redis', job_id: String(job.id) });
            return refreshWalletScore(wallet);
        },
        {
            connection: getRedisConnection(),
            concurrency: 2
        }
    );

    worker.on('completed', (job) => {
        recordRefreshCompleted();
        logger.info('refresh_completed', { mode: 'redis', job_id: String(job.id) });
    });

    worker.on('failed', (job, error) => {
        if (job && job.attemptsMade < (job.opts.attempts || REFRESH_ATTEMPTS)) {
            recordRefreshRetry();
            logger.warn('refresh_retry', {
                mode: 'redis',
                job_id: job && String(job.id),
                attempt: job && job.attemptsMade,
                error: error.message
            });
            return;
        }

        recordRefreshFailed();
        logger.error('refresh_failed', {
            mode: 'redis',
            job_id: job && String(job.id),
            error: error.message
        });
    });

    logger.info('worker_mode', { mode: 'redis' });
    return worker;
}

async function closeQueue() {
    if (worker) {
        await worker.close();
        worker = null;
    }

    if (queue) {
        await queue.close();
        queue = null;
    }
}

module.exports = {
    enqueueWalletRefresh,
    startWorker,
    closeQueue,
    QUEUE_NAME
};
