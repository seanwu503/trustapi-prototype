# TrustAPI

Prototype API that fetches Ethereum wallet data via Alchemy, stores snapshots in Postgres, extracts trust features, and computes a weighted trust score.

**Pipeline:** `get_wallet_info` → `extract_features` → `score_wallet`

## Prerequisites

- Node.js 20+
- PostgreSQL with a `wallet_db` database
- [Alchemy](https://www.alchemy.com/) API key (Ethereum mainnet)

## Setup

```bash
cd Trust_API
npm install
cp .env.example .env
```

Edit `.env`:

```env
ALCHEMY_API_KEY=your-key-here
DATABASE_URL=postgresql://gwu@localhost:5432/wallet_db
```

Create tables:

```bash
npm run db:schema
```

Or with psql directly:

```bash
psql -d wallet_db -f Trust_API/db/schema.sql
```

## Run

```bash
cd Trust_API
npm start
```

Open the demo UI: **http://localhost:8000/demo.html**

## External API

Platform endpoints (`/check_wallet`, `/generate_proof`) are documented in **[Trust_API/docs/API.md](Trust_API/docs/API.md)**.

## Internal API

All endpoints accept a `wallet` address (`0x` + 40 hex chars).

### `POST /get_wallet_info`

Fetches on-chain data from Alchemy and saves a snapshot to Postgres.

```bash
curl -X POST http://localhost:8000/get_wallet_info \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"}'
```

Returns balance, transaction count, wallet age, and 30-day transfer buckets.

### `POST /extract_features`

Computes features from the latest snapshot (or fetches fresh data when `refresh` is true).

```bash
curl -X POST http://localhost:8000/extract_features \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7","refresh":false}'
```

Features: `wallet_age_days`, `activity_frequency`, `burst_score`. Stored in `wallet_features`.

For a new wallet with no snapshot, use `"refresh": true` or call `/get_wallet_info` first.

### `POST /score_wallet`

Computes a trust score from the latest features. Does not call Alchemy or store scores.

```bash
curl -X POST http://localhost:8000/score_wallet \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"}'
```

Returns `trust_score` (0–100), `trust_tier` (bronze/silver/gold), `human_likelihood`, and `confidence`.

Returns `404` if no features exist — run `/extract_features` first.

## CLI

Score a feature row by ID:

```bash
cd Trust_API
npm run score -- 1
```

## Project layout

```
demo.html                 # demo UI
Trust_API/
  server.js               # Express server
  alchemyClient.js        # Alchemy API calls
  featurePipeline.js      # feature math from snapshots
  scoringService.js       # weighted trust score + CLI
  db/
    schema.sql            # Postgres tables
    apply-schema.js       # migration runner
    client.js             # DB connection
    walletRepository.js   # wallet + snapshot writes
    featureRepository.js  # feature extraction + reads
```
