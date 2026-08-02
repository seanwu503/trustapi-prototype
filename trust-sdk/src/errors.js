class TrustApiError extends Error {
    constructor(message, { status, code, details } = {}) {
        super(message);
        this.name = 'TrustApiError';
        this.status = status ?? null;
        this.code = code ?? null;
        this.details = details ?? null;
    }
}

module.exports = {
    TrustApiError
};
