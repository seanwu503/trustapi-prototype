# @trustapi/sdk

Minimal Node.js SDK for [TrustAPI](../Trust_API/docs/API.md).

Use this from your **backend** (do not put the API key in browser JavaScript).

## Quick CLI test

With TrustAPI running (`cd Trust_API && npm start`):

```bash
cd trust-sdk
npm run check -- 0xd8da6bf26964af9d7eed9e03e53415d37aa96045
npm run check -- 0xd8da6bf26964af9d7eed9e03e53415d37aa96045 --proof
```

Uses `API_KEY` from `Trust_API/.env` by default.

## Install (local)

From another app in this repo:

```bash
npm install ../trust-sdk
```

## Quick start

```js
const { TrustClient, TrustApiError } = require('@trustapi/sdk');

const trust = new TrustClient({
  apiKey: process.env.TRUST_API_KEY,
  baseUrl: 'http://localhost:8000' // optional
});

async function main() {
  try {
    const result = await trust.checkWallet('0xd8da6bf26964af9d7eed9e03e53415d37aa96045');
    console.log(result.trust_tier, result.trust_score, result.risk_flags);
  } catch (error) {
    if (error instanceof TrustApiError) {
      console.error(error.code, error.status, error.message);
      return;
    }
    throw error;
  }
}

main();
```

## API

### `new TrustClient({ apiKey, baseUrl?, timeoutMs? })`

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `apiKey` | yes | — | Sent as `X-API-Key` |
| `baseUrl` | no | `http://localhost:8000` | TrustAPI base URL |
| `timeoutMs` | no | `30000` | Request timeout |

### `checkWallet(wallet)`

Calls `POST /check_wallet`. Returns trust score, tier, risk flags, and features.

### `generateProof(wallet)`

Calls `POST /generate_proof`. Returns a proof object with expiry.

## Errors

Failures throw `TrustApiError` with:

- `message`
- `status` (HTTP status when available)
- `code`
- `details` (raw response body when available)
