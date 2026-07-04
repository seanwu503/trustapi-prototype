const { sendError } = require('./errors');

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
