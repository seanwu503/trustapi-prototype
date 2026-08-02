const { TrustApiError } = require('./errors');

const DEFAULT_BASE_URL = 'http://localhost:8000';
const WALLET_PATTERN = /^0x[a-fA-F0-9]{40}$/;

class TrustClient {
    /**
     * @param {{ apiKey: string, baseUrl?: string, timeoutMs?: number }} options
     */
    constructor(options = {}) {
        const apiKey = typeof options.apiKey === 'string' ? options.apiKey.trim() : '';

        if (!apiKey) {
            throw new TrustApiError('apiKey is required', { code: 'API_KEY_REQUIRED' });
        }

        this.apiKey = apiKey;
        this.baseUrl = (options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
        this.timeoutMs = options.timeoutMs || 30000;
    }

    /**
     * Evaluate wallet trust via POST /check_wallet.
     * @param {string} wallet
     */
    async checkWallet(wallet) {
        return this.#request('/check_wallet', wallet);
    }

    /**
     * Generate a portable trust proof via POST /generate_proof.
     * @param {string} wallet
     */
    async generateProof(wallet) {
        return this.#request('/generate_proof', wallet);
    }

    #normalizeWallet(wallet) {
        const value = typeof wallet === 'string' ? wallet.trim() : '';

        if (!value) {
            throw new TrustApiError('wallet is required', { code: 'WALLET_REQUIRED', status: 400 });
        }

        if (!WALLET_PATTERN.test(value)) {
            throw new TrustApiError('invalid wallet address', { code: 'INVALID_WALLET', status: 400 });
        }

        return value.toLowerCase();
    }

    async #request(path, wallet) {
        const normalizedWallet = this.#normalizeWallet(wallet);
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': this.apiKey
                },
                body: JSON.stringify({ wallet: normalizedWallet }),
                signal: controller.signal
            });

            let data = null;

            try {
                data = await response.json();
            } catch (error) {
                data = null;
            }

            if (!response.ok) {
                throw new TrustApiError(
                    (data && data.error) || `TrustAPI request failed (${response.status})`,
                    {
                        status: response.status,
                        code: (data && data.code) || 'REQUEST_FAILED',
                        details: data
                    }
                );
            }

            return data;
        } catch (error) {
            if (error instanceof TrustApiError) {
                throw error;
            }

            if (error && error.name === 'AbortError') {
                throw new TrustApiError('TrustAPI request timed out', {
                    code: 'TIMEOUT',
                    status: 408
                });
            }

            throw new TrustApiError(error.message || 'TrustAPI network error', {
                code: 'NETWORK_ERROR'
            });
        } finally {
            clearTimeout(timer);
        }
    }
}

module.exports = {
    TrustClient
};
