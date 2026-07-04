function createError(statusCode, message, code) {
    const error = new Error(message);
    error.statusCode = statusCode;

    if (code) {
        error.code = code;
    }

    return error;
}

function sendError(res, error, routeName) {
    const status = error.statusCode || 500;
    const isServerError = status >= 500;
    const body = {
        error: isServerError ? 'internal server error' : error.message
    };

    if (error.code) {
        body.code = error.code;
    }

    if (isServerError) {
        console.error(`[${routeName}]`, error.message);
    }

    res.status(status).json(body);
}

module.exports = {
    createError,
    sendError
};
