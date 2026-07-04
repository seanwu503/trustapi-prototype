function createError(statusCode, message, code) {
    const error = new Error(message);
    error.statusCode = statusCode;

    if (code) {
        error.code = code;
    }

    return error;
}

module.exports = {
    createError
};
