async function withRetries(fn, {
    attempts = 3,
    delayMs = 500,
    onRetry = null
} = {}) {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error;

            if (attempt >= attempts) {
                break;
            }

            if (onRetry) {
                onRetry(error, attempt);
            }

            await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        }
    }

    throw lastError;
}

module.exports = {
    withRetries
};
