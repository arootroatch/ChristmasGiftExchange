# Serverless Security Hardening

## Overview

Harden the serverless API by adding token-based authentication to unauthenticated endpoints, introducing an organizer identity, adding rate limiting via MongoDB, removing legacy endpoints, and applying defense-in-depth fixes (JSON parse safety, strict token matching, CSP header, token URL sanitization).

## 1. Organizer Identity & Creator Token Auth

### Organizer Capture Flow

A new screen appears in the email flow, after "Generate" and before `EmailTable`. It presents a simple form with name and email fields for the organizer. On submit:

1. Frontend calls new **`api-organizer-post`** with `{name, email}`
2. Endpoint upserts the organizer as a user (same pattern as participant upsert) and returns their token
3. Frontend stores the token in `localStorage`
4. Flow advances to `EmailTable`

This is the **only** time a token is sent to the frontend.

The organizer may also be a participant. Since upsert is by email, the organizer and participant will share the same user document and token. The `organizer` ObjectId on the exchange may also appear in `exchange.participants` — this is expected and correct.

`SendResults` no longer collects name/email — it reads organizer info from state since it was already collected.

### New Endpoint: `api-organizer-post`

- Request body: `{name, email}`
- Upserts user by email (creates with `crypto.randomUUID()` token if new, returns existing token if found)
- Response: `{token}`
- Rate limited at standard tier (30/min)

### Exchange Document Changes

Add an `organizer` field to the exchange document referencing the organizer's user ObjectId. Update the `exchangeSchema` Zod schema to include the new field:

```js
{
  exchangeId,
  organizer: ObjectId, // new — refs users collection
  isSecretSanta,
  houses: [...],
  participants: [...],
  assignments: [...],
  createdAt
}
```

### Authenticated `api-exchange-post`

`api-exchange-post` now requires `token` in the request body alongside the existing exchange data. The endpoint:

1. Verifies the token via `getUserByToken(token)`
2. Stores the authenticated user's ObjectId as `organizer` on the exchange document
3. No longer returns a token in the response (that's handled by `api-organizer-post`)

### Authenticated Organizer Endpoints

**`api-results-email-post`** — Minimize request body to `{token, exchangeId}`. Verify the token user is the exchange's organizer. Look up the organizer's name, email, and assignments from the database rather than trusting the request body.

**`api-giver-retry-post`** — Minimize request body to `{token, exchangeId}`. Verify the token user is the exchange's organizer. Look up participants and assignments from the database rather than trusting the request body. If a subset of participants need retrying, accept an optional `participantEmails` array to filter which participants get re-sent, but validate that all provided emails exist in the exchange.

### localStorage Strategy

After `api-organizer-post` returns the token, the frontend stores it in `localStorage`. This persists across refreshes and return visits, enabling authenticated calls to `api-exchange-post`, retries, and results emails even after navigating away.

## 2. Token Auth for Participant Endpoints

### Endpoint Changes

**`api-exchange-get` → `api-my-exchanges-post`** (rename + method change):
- Request body: `{token}`
- `getUserByToken(token)` → find exchanges where user is participant
- Response strips `assignments` — returns only: `exchangeId`, `createdAt`, `isSecretSanta`, `participantNames`, `houses`, `participants` (names + emails)
- POST because tokens are sensitive data and should not appear in query strings
- Renamed to avoid collision with existing `api-exchange-post` (which creates exchanges)

**`api-recipient-get` → `api-recipient-post`** (method change):
- Request body: `{token}`
- `getUserByToken(token)` → find latest exchange where user is giver → return recipient name
- Legacy fallback removed (legacy users don't have tokens; see Section 4)
- POST for same reason as above

**`api-wishlist-email-post`**:
- Request body changes from `{email, exchangeId}` to `{token, exchangeId}`
- `getUserByToken(token)` → verify giver in exchange → send wishlist link email to the token holder's email address

### Migrate Tokens Out of URLs for All API Endpoints

All API endpoints that currently accept tokens in URL paths or query strings must migrate to POST with tokens in the request body. This applies to:

- **`api-user-get/{token}` → `api-user-post`** — Token moves from path to POST body `{token}`
- **`api-user-wishlist-get/{exchangeId}?token={token}` → `api-user-wishlist-post`** — Token moves from query string to POST body `{token, exchangeId}`
- **`api-user-wishlist-put/{token}` → `api-user-wishlist-post`** — Already being renamed; token moves from path to POST body `{token, wishlists, wishItems}`
- **`api-user-contact-post/{token}`** — Token moves from path to POST body `{token, address?, phone?, notes?}`

Note: `api-user-wishlist-post` handles two operations (GET and PUT) distinguished by whether `wishlists`/`wishItems` are present in the body, or split into two distinctly named endpoints. Implementation plan will determine the best approach.

### New Endpoint: `api-token-email-post`

Purpose: "Forgot my token" recovery. Users who lost their Secret Santa email can request it be re-sent.

- Request body: `{email}`
- Finds user by email, sends an email containing their token and wishlist edit link
- Returns generic `{sent: true}` regardless of whether the email exists in the DB (prevents user enumeration)
- This is the one endpoint that must remain email-based by nature

### Token Sensitivity Rules

- Tokens are **never displayed on the website** — they are sensitive data treated like passwords
- Tokens are **only displayed in emails** sent to the user's own email address
- Token input fields on the frontend use `type="password"`
- Backend **never returns tokens** in API responses, except the organizer's own token from `api-organizer-post`

## 3. Secret Santa Email Update

The Secret Santa notification email (sent to each participant during exchange creation) must be updated to:

1. Explicitly display the user's token string in the email body
2. Include a message telling users to save the token — they'll need it to look up their recipient if they lose this email
3. Continue including the wishlist edit link (which contains the token in the URL, as it does today). Tokens in email links are acceptable because emails are private to the recipient. The browser-side exposure is handled by URL sanitization in Section 6.

## 4. Rate Limiting

### MongoDB-Based Rate Limiter

Add a `rateLimits` collection to MongoDB. Each document represents a rate limit window:

```js
{
  key: string,      // composite key: "${ip}:${endpoint}"
  endpoint: string,  // function name
  count: number,     // requests in current window
  windowStart: Date  // start of current window
}
```

Use a TTL index on `windowStart` to auto-expire old documents.

### Middleware Integration

Add a `rateLimit(options)` middleware function that runs before the handler in `apiHandler`. Options:

- `windowMs` — window duration (default: 60000ms / 1 minute)
- `maxRequests` — max requests per window per key

Returns `429 Too Many Requests` when the limit is exceeded.

### Rate Limit Tiers

**Tight limits** for email-sending endpoints (these cost money and can be abused):
- `api-token-email-post` — 3 requests per minute per IP
- `api-results-email-post` — 5 requests per minute per IP
- `api-giver-retry-post` — 5 requests per minute per IP
- `api-wishlist-email-post` — 5 requests per minute per IP
- `api-user-contact-post` — 5 requests per minute per IP

**Standard limits** for all other endpoints:
- 30 requests per minute per IP

## 5. Cleanup & Hardening

### Delete Legacy Endpoints

- Remove `postToDb.mjs` and `get_name.mjs`
- Remove `getLegacyCollection()` from `db.mjs`
- Remove the legacy fallback path in `api-recipient-post` (formerly `api-recipient-get`) — legacy users don't have tokens, so the legacy path is incompatible with token-based auth

### Fix `validateBody` JSON.parse

In `middleware.mjs`, wrap `JSON.parse(event.body)` in a try/catch. On parse failure, return `badRequest("Invalid JSON")` instead of letting the error propagate and trigger error alert emails.

### Fix `extractTokenFromPath` Strict Matching

Change `includes()` to strict segment equality. Split the path by `/`, find the segment immediately after the target segment name, and compare with `===` instead of `includes()`.

### Add CSP Header

Add to `netlify.toml` `[[headers]]` section:

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdnjs.buymeacoffee.com https://kit.fontawesome.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://ka-f.fontawesome.com; connect-src 'self' https://ka-f.fontawesome.com https://cdnjs.buymeacoffee.com; img-src 'self' data: https://cdn.buymeacoffee.com https://img.buymeacoffee.com; frame-src 'none'; object-src 'none'; base-uri 'self'
```

- `unsafe-inline` for styles needed because Google Fonts injects inline style elements
- `frame-src 'none'` complements existing `X-Frame-Options: DENY`
- `script-src` includes Font Awesome Kit (`kit.fontawesome.com`), Verifalia widget (`unpkg.com`), and Buy Me A Coffee widget
- `img-src` includes Buy Me A Coffee CDN domains for button/logo images
- `connect-src` includes Font Awesome and Buy Me A Coffee in case widgets make API calls
- `api-email-preview-get` is intentionally excluded from hardening — it is already gated to dev context only

## 6. Frontend Changes

### Token URL Sanitization

All frontend pages that receive tokens via URL parameters (e.g., `/wishlist/edit?user={token}`) must strip the token from the URL bar immediately after reading it:

```js
const token = new URLSearchParams(window.location.search).get('user');
history.replaceState(null, '', window.location.pathname);
```

This prevents the token from appearing in browser history or being visible in the URL bar after page load. The token lives only in a JS variable from that point forward.

Applies to: wishlist edit page, wishlist view page, and any other page that receives tokens via URL.

### New Organizer Screen

- New component in the email flow step sequence, between "Generate" and `EmailTable`
- Simple form: organizer name + organizer email (same visual style as `EmailTable`)
- On submit, stores organizer info in exchange state, advances to `EmailTable`

### RecipientSearch (Home Page)

- Input changes from email to token
- Input field uses `type="password"`
- Calls `api-recipient-post` with `{token}` in body instead of `api-recipient-get?email=`
- Update labels (e.g., "Enter your token" instead of "Enter your email")

### Reuse Feature

- Input changes from email to token
- Input field uses `type="password"`
- Calls `api-my-exchanges-post` with `{token}` in body
- Update labels

### localStorage for Organizer Token

- After `api-exchange-post` response, store organizer token in `localStorage`
- `EmailTable` retry and `SendResults` read token from `localStorage` for authenticated calls

### SendResults Simplification

- No longer collects name/email — reads from organizer state (already collected in organizer screen)
