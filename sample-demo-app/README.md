# Sample Demo App — Ticket Booth

Demo storefront that **sells event tickets** and checks the buyer’s digital wallet with `@trustapi/sdk` before checkout.

## What it shows

1. Choose an event ticket  
2. Enter a wallet address as payment method  
3. Server calls Trust SDK (`checkWallet`)  
4. Allow checkout (silver/gold, no risk flags) or block (bronze / flags)

## Run

Terminal 1 — TrustAPI:

```bash
cd Trust_API
npm start
```

Terminal 2 — ticket demo:

```bash
cd sample-demo-app
npm install
npm start
```

Open **http://localhost:3001**

Uses `API_KEY` from `Trust_API/.env` automatically (or set `TRUST_API_KEY` in `sample-demo-app/.env`).
