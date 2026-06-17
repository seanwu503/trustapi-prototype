# TrustAPI Backend

Node.js/Express backend for the dummy JSON response prototype.

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Default environment values:

```env
PORT=8000
CORS_ALLOWED_ORIGIN=*
DATABASE_URL=
DATABASE_SSL=false
BLOCKCHAIN_PROVIDER_URL=
BLOCKCHAIN_API_KEY=
```

`DATABASE_URL` is optional. If it is empty, the API still returns dummy responses without saving them.

`BLOCKCHAIN_PROVIDER_URL` is optional. If it is empty, wallet ingestion still works and reports blockchain status as `not_configured`.

## Database

The backend uses Postgres through the `pg` package. You can use either local Postgres or Supabase because Supabase exposes a normal Postgres connection string.

### Local Postgres

Create a database named `trustapi`, then set:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trustapi
DATABASE_SSL=false
```

Apply the starter schema:

```bash
npm run db:schema
```

### Supabase

In Supabase, create a project and copy the Postgres connection string from the project database settings.

Set:

```env
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
DATABASE_SSL=true
```

Then apply `db/schema.sql` in either:

- Supabase SQL Editor.
- A terminal with `npm run db:schema`.

The starter tables are:

```text
wallet_checks
wallets
```

Each `POST /check_wallet` request is saved there when `DATABASE_URL` is configured.

`wallet_checks` stores dummy check responses from the current prototype endpoint.

`wallets` stores ingested wallet addresses and chains for the wallet ingestion endpoint.

## Blockchain Provider

The backend has a blockchain client foundation in:

```text
integrations/blockchainClient.js
```

Without a provider URL, wallet ingestion returns:

```json
{
  "status": "not_configured",
  "provider": "none",
  "transaction_count": null
}
```

With an EVM JSON-RPC provider URL, the client can call `eth_getTransactionCount` for supported EVM chains.

Example environment values:

```env
BLOCKCHAIN_PROVIDER_URL=https://eth-mainnet.g.alchemy.com/v2/{API_KEY}
BLOCKCHAIN_API_KEY=your-api-key
```

## Run

Start the API:

```bash
npm start
```

Run with auto-restart while editing:

```bash
npm run dev
```

## Endpoints

Health check:

```text
GET /health
```

The health response includes database state:

```json
{
  "status": "ok",
  "service": "trust-api",
  "database": "not_configured",
  "uptime_seconds": 12
}
```

Dummy wallet check:

```text
POST /check_wallet
```

Example request:

```json
{
  "wallet": "0x123"
}
```

Example response:

```json
{
  "wallet": "0x123",
  "status": "success",
  "human_likelihood": "unknown",
  "trust_tier": "unknown"
}
```

Wallet ingestion:

```text
POST /wallets/ingest
```

Example request:

```json
{
  "wallet": "0x123",
  "chain": "ethereum"
}
```

Example response:

```json
{
  "wallet": "0x123",
  "chain": "ethereum",
  "status": "ingested",
  "source": "manual",
  "database": "not_configured",
  "blockchain": {
    "status": "not_configured",
    "provider": "none",
    "transaction_count": null
  },
  "message": "Wallet ingestion completed."
}
```

Missing wallet response:

```json
{
  "status": "error",
  "code": "missing_wallet",
  "message": "wallet is required"
}
```

Missing chain response:

```json
{
  "status": "error",
  "code": "missing_chain",
  "message": "chain is required"
}
```

## Checks

Run syntax checks and endpoint tests:

```bash
npm test
```

Current endpoint tests cover:

- `GET /health`
- successful `POST /wallets/ingest`
- missing wallet validation
- missing chain validation

Apply the database schema after setting `DATABASE_URL`:

```bash
npm run db:schema
```
