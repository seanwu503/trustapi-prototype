# TrustAPI External API

API reference for platforms integrating wallet trust checks and proof generation.

**Base URL:** `https://api.trustapi.io` (production) · `http://localhost:8000` (local)

**Chain:** Ethereum mainnet

---

## Authentication

Every request must include your platform API key:

```
X-API-Key: YOUR_API_KEY
```

Contact TrustAPI to obtain a key. Missing or invalid keys return `401`.

---

## Which endpoint should I use?

| Endpoint | When to use it |
|----------|----------------|
| **`POST /check_wallet`** | You need an immediate trust decision — e.g. at signup, login, or before granting access. |
| **`POST /generate_proof`** | A user needs a portable trust credential they can save and present later (valid for 30 days). |

---

## POST /check_wallet

Evaluate whether a wallet appears trustworthy based on on-chain activity signals.

### Request

**Headers**

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `X-API-Key` | Your API key |

**Body**

```json
{
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `wallet` | string | yes | Ethereum wallet address |

### Response `200 OK`

```json
{
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "trust_score": 84.4,
  "trust_tier": "gold",
  "human_likelihood": "high",
  "confidence": 1.0,
  "features": {
    "wallet_age_days": 3925,
    "activity_frequency": 8.3333,
    "burst_score": 4.092
  }
}
```

### Response fields

| Field | Description |
|-------|-------------|
| `trust_score` | Overall trust score from **0 to 100** |
| `trust_tier` | `bronze`, `silver`, or `gold` |
| `human_likelihood` | `low`, `medium`, or `high` — estimated likelihood the wallet belongs to a real human user |
| `confidence` | How confident the score is, from **0 to 1** |
| `features.wallet_age_days` | How many days the wallet has existed on-chain |
| `features.activity_frequency` | Average number of transfers per day over the last 30 days |
| `features.burst_score` | How spiky recent activity is — lower values indicate steadier, more typical usage |

### Trust tiers

| Tier | Score |
|------|-------|
| `gold` | 75 – 100 |
| `silver` | 50 – 74 |
| `bronze` | 0 – 49 |

### Example

```bash
curl -X POST https://api.trustapi.io/check_wallet \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"}'
```

---

## POST /generate_proof

Issue a time-bound trust proof for a wallet. Includes the same trust signals as `/check_wallet`, plus proof metadata.

Use this when a user should receive a credential they can store and show to other applications.

### Request

Same format as `/check_wallet`.

```json
{
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
}
```

### Response `200 OK`

```json
{
  "proof_id": "93b63b38-a1b2-4c3d-8e9f-0123456789ab",
  "wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7",
  "trust_score": 84.4,
  "trust_tier": "gold",
  "human_likelihood": "high",
  "confidence": 1.0,
  "features": {
    "wallet_age_days": 3925,
    "activity_frequency": 8.3333,
    "burst_score": 4.092
  },
  "issued_at": "2026-06-27T19:11:02.733Z",
  "expires_at": "2026-07-27T19:11:02.733Z"
}
```

### Proof fields

| Field | Description |
|-------|-------------|
| `proof_id` | Unique identifier for this proof |
| `issued_at` | When the wallet data used for this proof was collected (ISO 8601) |
| `expires_at` | When this proof is no longer valid — 30 days after `issued_at` |

Each call generates a new `proof_id`. Store the proof JSON on your side if the user needs to reuse it.

### Example

```bash
curl -X POST https://api.trustapi.io/generate_proof \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{"wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"}'
```

---

## Errors

Errors are returned as JSON:

```json
{
  "error": "invalid wallet address",
  "code": "INVALID_WALLET"
}
```

| HTTP status | Code | Meaning |
|-------------|------|---------|
| `400` | `WALLET_REQUIRED` | Request body is missing `wallet` |
| `400` | `INVALID_WALLET` | `wallet` is not a valid Ethereum address |
| `401` | `API_KEY_REQUIRED` | `X-API-Key` header is missing |
| `401` | `INVALID_API_KEY` | API key is not recognized |
| `404` | `WALLET_NOT_FOUND` | Wallet could not be analyzed |
| `502` | `ALCHEMY_REQUEST_FAILED` | Upstream data source temporarily unavailable |
| `503` | — | Service temporarily unavailable |
| `500` | — | Unexpected error |

---

## Notes for integrators

- Wallet addresses must be valid Ethereum mainnet addresses (`0x` followed by 40 hexadecimal characters).
- Wallet data is refreshed automatically if the last analysis is older than **7 days**.
- A proof reflects wallet state as of `issued_at`. Activity after that date is not included.
- To gate access, call `/check_wallet` and use `trust_score` or `trust_tier` in your application logic.
