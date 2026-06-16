# System Architecture Plan: Dummy JSON Response Prototype

## Goal

Build the project in small parts that can be completed and tested one by one.

Final system:

```text
User
  |
  v
Frontend
  |
  v
Node.js API Server
  |
  v
Dummy JSON Response
```

This version only proves that the frontend can send a request to the backend and receive a dummy JSON response.

No database, login system, blockchain connection, wallet verification, API keys, or real trust scoring are included yet.

---

## Part 1: Project Files

### Purpose

Make sure the project has the basic files needed for the prototype.

### Files

```text
Internship/
  landing-page.html
  developer-docs.html
  platform-dashboard.html
  user-proof-generation.html
  system-architecture-plan.md
  Trust_API/
    package.json
    server.js
```

### What this part does

- Keeps frontend pages separate from the backend API.
- Keeps the Node.js server inside the `Trust_API` folder.
- Keeps this plan as the guide for building the prototype.

### Done when

- The HTML files exist.
- `Trust_API/server.js` exists.
- `Trust_API/package.json` exists.
- This plan exists as `system-architecture-plan.md`.

---

## Part 2: Node.js API Server

### Purpose

Create the backend server that receives requests.

### File to work on

```text
Trust_API/server.js
```

### Server responsibilities

- Start an Express server.
- Listen on port `8000`.
- Accept JSON request bodies.
- Provide one API endpoint: `POST /check_wallet`.
- Return a dummy JSON response.

### Backend code shape

```js
const express = require('express');

const app = express();

app.use(express.json());

app.post('/check_wallet', (req, res) => {
    const wallet = req.body.wallet;

    res.json({
        wallet: wallet,
        status: "success",
        human_likelihood: "unknown",
        trust_tier: "unknown"
    });
});

app.listen(8000, () => {
    console.log("Server running on port 8000");
});
```

### Done when

- The server starts without errors.
- Terminal shows:

```text
Server running on port 8000
```

---

## Part 3: Dummy API Endpoint

### Purpose

Make sure the backend can return a dummy response.

### Endpoint

```text
POST http://localhost:8000/check_wallet
```

### Request body

```json
{
  "wallet": "0x123"
}
```

### Expected response

```json
{
  "wallet": "0x123",
  "status": "success",
  "human_likelihood": "unknown",
  "trust_tier": "unknown"
}
```

### What this proves

- The API server is running.
- The API accepts POST requests.
- The API accepts JSON.
- The API can send JSON back.

### Done when

- The request returns `200 OK`.
- The response body contains the wallet value.
- The response body contains `status: "success"`.
- The response body contains dummy values for `human_likelihood` and `trust_tier`.

---

## Part 4: Frontend Input

### Purpose

Create the user-facing part that collects a wallet address.

### Best page to use

```text
user-proof-generation.html
```

### Frontend responsibilities

- Show a wallet input field.
- Show a button to submit the wallet.
- Read the wallet value from the input.
- Prepare the wallet value for the API request.

### Example UI elements

```html
<input id="walletInput" placeholder="Enter wallet address">
<button id="checkWalletButton">Check Wallet</button>
<pre id="result"></pre>
```

### Done when

- A user can type a wallet address.
- A user can click a button.
- The page can read the typed wallet address with JavaScript.

---

## Part 5: Connect Frontend to Backend

### Purpose

Send the wallet from the frontend to the Node.js API server.

### Frontend request

```js
fetch('http://localhost:8000/check_wallet', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        wallet: walletInputValue
    })
})
    .then(response => response.json())
    .then(data => {
        console.log(data);
    });
```

### What this part does

- Takes the wallet typed by the user.
- Sends it to `POST /check_wallet`.
- Receives the dummy JSON response.
- Logs or displays the response.

### Done when

- Clicking the frontend button sends a request to the API.
- The API returns `200 OK`.
- The frontend receives the JSON response.

---

## Part 6: Display the Dummy Response

### Purpose

Show the API response on the webpage so the user can see the result.

### Display fields

Show:

- Wallet
- Status
- Human likelihood
- Trust tier

### Example display logic

```js
document.getElementById('result').textContent = JSON.stringify(data, null, 2);
```

### Example displayed result

```json
{
  "wallet": "0x123",
  "status": "success",
  "human_likelihood": "unknown",
  "trust_tier": "unknown"
}
```

### Done when

- The response appears on the page.
- The displayed wallet matches the submitted wallet.
- The user does not need to open the browser console to see the result.

---

## Part 7: Optional Homepage Route

### Purpose

Make `http://localhost:8000` show a simple message instead of `Cannot GET /`.

### Why this happens

The browser sends this request:

```text
GET /
```

But the API currently only supports:

```text
POST /check_wallet
```

So Express shows:

```text
Cannot GET /
```

That does not mean the API is broken.

### Optional route

Add this above the `/check_wallet` endpoint:

```js
app.get('/', (req, res) => {
    res.send('TrustAPI server is running. Use POST /check_wallet to get the dummy JSON response.');
});
```

### Done when

- Visiting `http://localhost:8000` shows a friendly message.
- `POST /check_wallet` still works.

---

## Part 8: Manual Testing

### Test 1: Start backend

From the project folder:

```bash
cd Trust_API
node server.js
```

Expected terminal output:

```text
Server running on port 8000
```

### Test 2: Test API directly

Send:

```text
POST http://localhost:8000/check_wallet
```

With:

```json
{
  "wallet": "0x123"
}
```

Expected:

```text
200 OK
```

### Test 3: Test frontend

Open:

```text
user-proof-generation.html
```

Then:

1. Enter `0x123`.
2. Click the check button.
3. Confirm the dummy JSON appears on the page.

---

## Final Assembly Order

Build the parts in this order:

1. Confirm the project files exist.
2. Start the Node.js API server.
3. Test `POST /check_wallet` directly.
4. Add or confirm frontend wallet input.
5. Connect the frontend button to the API using `fetch`.
6. Display the API response on the page.
7. Optionally add a friendly homepage route.
8. Run the full manual test from frontend to backend.

---

## Complete Prototype Checklist

- [x] Project files are organized.
- [x] Node.js server starts on port `8000`.
- [x] API has `POST /check_wallet`.
- [x] API returns dummy JSON.
- [x] Direct API test returns `200 OK`.
- [x] Frontend has wallet input.
- [x] Frontend has submit button.
- [x] Frontend sends wallet to backend.
- [x] Frontend displays the dummy response.
- [x] Optional homepage route shows server message.
- [x] No real scoring or database is required.

---

## What Comes Later

Only after this dummy flow works, future versions can add:

- Wallet input validation.
- Better frontend styling.
- Real trust scoring logic.
- Database storage.
- API keys.
- Dashboard data.
- Proof generation.
- Blockchain integration.

The current goal is only the basic request-response loop.
