# TrustAPI

Prototype that scores Ethereum wallet trust from on-chain activity (Alchemy + Postgres), exposes an HTTP API, ships a **developer SDK**, and includes a **sample ticket shop** that checks wallets before checkout.

**Core pipeline:** `get_wallet_info` → `extract_features` → `score_wallet` / `check_wallet`

## Prerequisites

- Node.js 20+
- PostgreSQL with a `wallet_db` database
- [Alchemy](https://www.alchemy.com/) API key (Ethereum mainnet)

## Setup (API)

```bash
cd Trust_API
npm install
cp .env.example .env
```

Edit `.env`:

```env
ALCHEMY_API_KEY=your-key-here
DATABASE_URL=postgresql://gwu@localhost:5432/wallet_db
API_KEY=your-platform-api-key
```

Create tables:

```bash
npm run db:schema
```

## Run TrustAPI

```bash
cd Trust_API
npm start
```

- Demo UI: **http://localhost:8000/demo.html**
- Internal dashboard: **http://localhost:8000/dashboard.html**

External endpoints (`/check_wallet`, `/generate_proof`) are documented in **[Trust_API/docs/API.md](Trust_API/docs/API.md)**.

---

## Trust SDK (`trust-sdk/`)

Node.js client for other apps: `@trustapi/sdk`.

```bash
cd trust-sdk
npm test
npm run check -- 0xd8da6bf26964af9d7eed9e03e53415d37aa96045
```

Usage (from your **backend** — keep the API key off the browser):

```js
const { TrustClient } = require('@trustapi/sdk');

const trust = new TrustClient({
  apiKey: process.env.API_KEY,
  baseUrl: 'http://localhost:8000'
});

const result = await trust.checkWallet('0x...');
```

See **[trust-sdk/README.md](trust-sdk/README.md)**.

---

## Sample ticket app (`sample-demo-app/`)

Demo **online ticket booth**. At checkout it calls the Trust SDK to decide if the buyer’s digital wallet can be trusted before confirming tickets.

```bash
# terminal 1 — TrustAPI
cd Trust_API && npm start

# terminal 2 — ticket demo
cd sample-demo-app
npm install
npm start
```

Open **http://localhost:3001**

Checkout policy (demo): allow `silver`/`gold` with no risk flags; block `bronze` or any risk flags.

See **[sample-demo-app/README.md](sample-demo-app/README.md)**.

---

## Internal API (quick reference)

All endpoints accept a `wallet` address (`0x` + 40 hex chars).

### `POST /get_wallet_info`

Fetches on-chain data from Alchemy and saves a snapshot to Postgres.

### `POST /extract_features`

Computes features from the latest snapshot (use `"refresh": true` for new wallets).

### `POST /score_wallet`

Scores latest features. Returns `404` if features are missing.

### `POST /check_wallet` / `POST /generate_proof`

Platform endpoints — require `X-API-Key`. Prefer the SDK for integrations.

## CLI

```bash
cd Trust_API
npm run score -- 1
npm run benchmark
```

## Project layout

```
demo.html                 # basic API demo UI
dashboard.html            # internal ops dashboard
Trust_API/                # Express API + scoring + queue/cache
trust-sdk/                # @trustapi/sdk developer client
sample-demo-app/          # ticket booth demo using the SDK
```
