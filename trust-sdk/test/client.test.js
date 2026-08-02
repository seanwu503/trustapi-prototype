const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TrustClient, TrustApiError } = require('../src');

test('requires apiKey', () => {
    assert.throws(() => new TrustClient({}), (error) => {
        assert.equal(error instanceof TrustApiError, true);
        assert.equal(error.code, 'API_KEY_REQUIRED');
        return true;
    });
});

test('rejects invalid wallet before calling the network', async () => {
    const client = new TrustClient({ apiKey: 'test-key' });

    await assert.rejects(
        () => client.checkWallet('not-a-wallet'),
        (error) => {
            assert.equal(error instanceof TrustApiError, true);
            assert.equal(error.code, 'INVALID_WALLET');
            return true;
        }
    );
});
