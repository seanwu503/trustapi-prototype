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

function asyncRoute(routeName, handler) {
    return async (req, res) => {
        try {
            await handler(req, res);
        } catch (error) {
            sendError(res, error, routeName);
        }
    };
}

module.exports = {
    asyncRoute
};
