# TrustAPI

Minimal wallet lookup service. Fetches Ethereum wallet data from Alchemy and saves snapshots to Postgres.

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
psql -d wallet_db -f db/schema.sql
```

## Run

```bash
npm start
```

Open the demo UI: **http://localhost:8000/demo.html**

## API

**`POST /get_wallet_info`**

```bash
curl -X POST http://localhost:8000/get_wallet_info \
  -H "Content-Type: application/json" \
  -d '{"wallet":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"}'
```

**`POST /check_wallet`** — returns hardcoded dummy trust data (no Alchemy/DB).

## Project layout

```
demo.html              # demo UI
Trust_API/
  server.js            # Express server
  alchemyClient.js     # Alchemy API calls
  db/
    schema.sql         # Postgres tables
    client.js          # DB connection
    walletRepository.js
```
