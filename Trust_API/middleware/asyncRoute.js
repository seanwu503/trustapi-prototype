const { sendError } = require('./errors');
const { recordRequest } = require('../metrics');
const logger = require('../logger');

function asyncRoute(routeName, handler) {
    return async (req, res) => {
        const started = Date.now();
        const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

        res.setHeader('X-Request-Id', requestId);

        try {
            await handler(req, res);

            const durationMs = Date.now() - started;
            recordRequest({
                route: routeName,
                statusCode: res.statusCode || 200,
                durationMs,
                error: false
            });
            logger.info('request_completed', {
                request_id: requestId,
                route: routeName,
                method: req.method,
                status: res.statusCode || 200,
                duration_ms: durationMs
            });
        } catch (error) {
            const durationMs = Date.now() - started;
            recordRequest({
                route: routeName,
                statusCode: error.statusCode || 500,
                durationMs,
                error: true
            });
            logger.error('request_failed', {
                request_id: requestId,
                route: routeName,
                method: req.method,
                status: error.statusCode || 500,
                duration_ms: durationMs,
                error: error.message
            });
            sendError(res, error, routeName);
        }
    };
}

module.exports = {
    asyncRoute
};
