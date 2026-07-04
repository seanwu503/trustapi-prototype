const { createError } = require('./errors');

function requireApiKey(req, res, next) {
    const expectedKey = process.env.API_KEY;

    if (!expectedKey) {
        return next(createError(503, 'api key not configured', 'API_KEY_NOT_CONFIGURED'));
    }

    const providedKey = req.get('X-API-Key');

    if (!providedKey) {
        return next(createError(401, 'api key required', 'API_KEY_REQUIRED'));
    }

    if (providedKey !== expectedKey) {
        return next(createError(401, 'invalid api key', 'INVALID_API_KEY'));
    }

    next();
}

module.exports = {
    requireApiKey
};
