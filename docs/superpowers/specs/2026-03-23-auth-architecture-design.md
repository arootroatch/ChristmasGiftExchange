# Auth Architecture: Verification Codes, JWTs, and httpOnly Cookies

## Overview

Replace all permanent token-based authentication with email verification codes + session JWTs stored in httpOnly cookies. Eliminates permanent credentials from the database, removes all auth-related frontend code, and restores proper HTTP methods. No auth data in any URL — email links are plain deep links, and authentication happens on the page via a standard verification code flow.

## 1. Auth Architecture

### Two-Phase Authentication

All users (organizers and participants) authenticate through the same system:

1. **Identification** — User provides their email. Server sends an 8-digit verification code to that email.
2. **Verification** — User enters the code. Server validates it, returns a session JWT in an httpOnly cookie.

All subsequent API requests are authenticated via the cookie. The frontend never touches auth tokens. No permanent credentials stored in the database.

### Verification Codes

- 8-digit numeric (e.g., `84729163`)
- HMAC-SHA256 hashed with a derived key (`HMAC(JWT_SECRET, "auth-codes")`) for cryptographic domain separation from JWT signing
- 10-minute expiry
- Single-use (marked used after successful verification)
- Max 5 failed attempts per email, then locked until a new code is requested
- One code type for all flows — organizers, participants, forgot-access all use the same 8-digit code

HMAC-SHA256 is used rather than bcrypt. The 8-digit keyspace (100 million values) combined with the 5-attempt lockout gives a 0.000005% chance of brute-force success. HMAC-SHA256 is faster (important for serverless cold starts) and equally secure given the server-side rate limits.

### Session

- **All users get a 48-hour JWT** — no role-based tiers
- Authorization is checked at the endpoint level (e.g., `exchange.organizer.equals(event.user._id)`)
- The JWT contains no role — just `{userId, exp, iat}`
- This prevents role-forging attacks and simplifies the design

### Cookie Settings

```
Set-Cookie: session=<JWT>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=172800
```

- `HttpOnly` — invisible to JavaScript, prevents XSS token theft
- `Secure` — HTTPS only
- `SameSite=Strict` — prevents CSRF
- `Max-Age` — 172800 (48 hours)

## 2. Endpoint Changes

### New Endpoints

**`POST api-auth-code-post`** — Takes `{email}`. Generates an 8-digit code, HMAC-SHA256 hashes and stores it, sends code via email. Returns `{sent: true}` regardless of whether email exists (anti-enumeration). Rate limited at 3/min.

**`POST api-auth-verify-post`** — Takes `{email, code, name?}`. The optional `name` field is used for organizer upsert: if `name` is provided and no user exists, creates a user with that name and email; if user exists, updates their name. If `name` is not provided and no user exists, returns 401 (prevents anonymous users from getting sessions). Validates code against stored hash, marks as used. Sets httpOnly cookie with JWT. Returns `{success: true}`. Rate limited at 5/min.

**`POST api-auth-logout-post`** — Clears the session cookie. Returns `{success: true}`.

### Restored HTTP Methods

| Current (from security hardening PR) | New |
|---|---|
| `POST api-recipient-post {token}` | `GET api-recipient-get` (cookie auth) |
| `POST api-my-exchanges-post {token}` | `GET api-my-exchanges-get` (cookie auth) |
| `POST api-user-post {token}` | `GET api-user-get` (cookie auth) |
| `POST api-user-wishlist-view-post {token, exchangeId}` | `GET api-user-wishlist-get?exchangeId=` (cookie auth) |
| `POST api-user-wishlist-save-post {token, ...}` | `PUT api-user-wishlist-put` (cookie auth) |
| `POST api-user-contact-post {token, ...}` | `POST api-user-contact-post {...}` (cookie auth, no token in body) |
| `POST api-exchange-post {token, ...}` | `POST api-exchange-post {...}` (cookie auth, no token in body) |
| `POST api-results-email-post {token, exchangeId}` | `POST api-results-email-post {exchangeId}` (cookie auth) |
| `POST api-giver-retry-post {token, exchangeId, ...}` | `POST api-giver-retry-post {exchangeId, ...}` (cookie auth) |
| `POST api-wishlist-email-post {token, exchangeId}` | `POST api-wishlist-email-post {exchangeId}` (cookie auth) |

### Removed Endpoints

- `api-organizer-post` — Replaced by `api-auth-code-post` + `api-auth-verify-post`
- `api-token-email-post` — Replaced by `api-auth-code-post` (same flow for everyone)

### Rate Limits

Converted endpoints preserve their existing rate limit tiers from the security hardening PR:
- **Email-sending endpoints** (5 req/min): api-results-email-post, api-giver-retry-post, api-wishlist-email-post, api-user-contact-post
- **All other endpoints** (30 req/min): api-exchange-post, api-recipient-get, api-my-exchanges-get, api-user-get, api-user-wishlist-get, api-user-wishlist-put
- **Auth endpoints**: api-auth-code-post (3 req/min), api-auth-verify-post (5 req/min)
- **Skip**: api-email-preview-get (dev-only)

### Origin Validation

All endpoints validate the `Origin` header to prevent cross-origin requests. Added to `apiHandler` before rate limiting:

1. Read `event.headers.origin`
2. If present and does not match `process.env.URL`, return 403
3. If absent (same-origin requests, server-to-server), allow through

This blocks browser-based cross-origin attacks. Non-browser clients can spoof the header but cannot steal httpOnly cookies, so the combination of origin validation + cookie auth + rate limiting covers all vectors.

### Auth Middleware

A new `requireAuth()` function:
1. Reads session cookie from `event.headers.cookie`
2. Verifies JWT signature and expiry using `JWT_SECRET`
3. Looks up user by `userId` from the JWT payload
4. Attaches user document to `event.user`
5. Returns 401 if cookie missing/invalid/expired or user not found

Organizer-only endpoints additionally check `exchange.organizer.equals(event.user._id)` and return 403 if it doesn't match.

### Response Helper Update

Extend `responses.mjs` to support custom headers. Add an `okWithHeaders(data, headers)` function (or add an optional `headers` parameter to `ok()`) so `api-auth-verify-post` can set the `Set-Cookie` header. The `api-auth-logout-post` endpoint also needs to set a cookie-clearing header.

## 3. Auth Flows

### Organizer Flow (Exchange Creation Page)

1. User fills in participants, houses, clicks Generate
2. OrganizerForm appears — collects name + email
3. Frontend calls `api-auth-code-post` with `{email}`
4. OrganizerForm re-renders as code input: "Check your email for a verification code"
5. User enters 8-digit code
6. Frontend calls `api-auth-verify-post` with `{email, code, name}`
7. Server validates code, upserts user (creates if new with name/email, updates name if existing), sets cookie with 48-hour JWT
8. Flow proceeds to EmailTable

### Participant Flow (Clicking Email Link)

1. Secret Santa email contains a link: `/wishlist/edit` (no auth data in URL)
2. Page loads, checks for valid session cookie
3. If valid cookie → load page normally
4. If no cookie / expired → show "Enter your email to continue" with email input
5. User enters email → `api-auth-code-post` sends 8-digit code
6. User enters code → `api-auth-verify-post` validates, sets cookie
7. Page loads user data via `GET api-user-get` (cookie sent automatically)

The email tells users what to do ("click here to edit your wishlist") but the link carries no secret. Auth happens on the page — a standard MFA-like flow.

### Notification Email Links

All notification emails (wishlist update notifications, wishlist view links) follow the same pattern — links are plain deep links with no auth data:

- Wishlist edit: `/wishlist/edit`
- Wishlist view: `/wishlist/view?exchange=EXCHANGE_ID`

On page load, if no valid session cookie exists, the user authenticates via the 8-digit code flow. The `exchange` query param is preserved through auth so the page knows which exchange to load after authentication.

### "Forgot Access" Flow (Home Page)

User enters email → `api-auth-code-post` sends 8-digit code → user enters code → `api-auth-verify-post` validates, confirms user exists in DB (returns 401 if not), sets cookie → user can now access recipient lookup, wishlists, etc.

### Legacy Link Fallback

Users who received emails before migration have links with `?user=TOKEN`. After migration these links break. Frontend pages detect `?user=` in URL params and show a message: "This link has expired. Enter your email to get a new verification code." with an email input that triggers the standard code flow.

## 4. Database Changes

### User Document — Remove `token` Field

```js
// Before:
{_id, name, email, token, wishlists, wishItems}

// After:
{_id, name, email, wishlists, wishItems}
```

Migration: `db.users.updateMany({}, {$unset: {token: ""}})`

Update `userSchema` in Zod to remove `token: z.uuid()`.

### New `authCodes` Collection

```js
{
  email: string,        // indexed
  codeHash: string,     // HMAC-SHA256 hash of 8-digit code
  expiresAt: Date,      // TTL index for auto-cleanup
  used: boolean,        // marked true after successful verify
  attempts: number,     // failed attempts counter
  createdAt: Date,
}
```

Indexes:
- TTL index on `expiresAt` for auto-cleanup
- Compound index on `{email, used, expiresAt}` for efficient lookups

When a new code is requested for an email, delete all existing codes for that email (regardless of `used` status). Only one active code per email at a time.

### JWT Payload

```js
{
  userId: string,       // user._id.toString()
  exp: number,          // 48 hours from now
  iat: number,
}
```

Signed with `JWT_SECRET` env var. Use the `jose` npm package (lightweight, no native dependencies, ideal for serverless).

HMAC-SHA256 for code hashing uses a derived key (`HMAC(JWT_SECRET, "auth-codes")`) to maintain cryptographic domain separation from JWT signing.

### JWT_SECRET Rotation

If `JWT_SECRET` needs to be rotated, all active sessions and outstanding codes are invalidated. For this app's scale and threat model, this is acceptable — users simply re-authenticate. No dual-key verification window is needed. If rotation happens, clear the `authCodes` collection and users will request new codes naturally.

### New Collection Accessor

Add `getAuthCodesCollection()` to `netlify/shared/db.mjs` following the existing pattern for `getUsersCollection()` and `getExchangesCollection()`.

### Exchange Document — No Changes

The `organizer` ObjectId field stays as-is. Organizer-only endpoints verify `exchange.organizer.equals(event.user._id)`.

## 5. Frontend Changes

### OrganizerForm — Two-Step Flow

1. First render: name + email inputs + submit button (same as now)
2. On submit: calls `api-auth-code-post`, re-renders as code input + submit button ("Check your email for a verification code")
3. On code submit: calls `api-auth-verify-post` with `{email, code, name}`, cookie set automatically by browser, emits `ORGANIZER_SET`

### Participant Pages — Auth Gate on Load

Wishlist edit and wishlist view pages:
1. Check for valid session cookie by calling a lightweight auth-check (e.g., `GET api-user-get` — if 401, need auth)
2. If authenticated → load page normally
3. If not authenticated → show email input + code flow (same as home page)
4. If `?user=` detected in URL (legacy link) → show "This link has expired. Enter your email to get a new verification code."
5. Preserve any query params (e.g., `?exchange=EXCHANGE_ID`) through the auth flow so the page can use them after authentication

### RecipientSearch (Home Page) — Two-Step Flow

1. User enters email, clicks submit
2. Calls `api-auth-code-post`, shows code input
3. User enters code, calls `api-auth-verify-post`, cookie set
4. Calls `GET api-recipient-get` (cookie auth) to show recipient

### Reuse Page — Same Two-Step Flow

Same pattern as RecipientSearch.

### Remove All Auth-Related Frontend Code

- Remove `getOrganizerToken()` / `setOrganizer()` token storage
- Remove `localStorage` token management
- Remove `type="password"` token inputs (replaced by email + code inputs)
- `apiFetch` stays simple — browser handles cookies automatically. All API calls are same-origin (`/.netlify/functions/` path), so the default `credentials: "same-origin"` behavior works without any changes. Netlify Dev also serves functions under the same origin.

### Email Link Format Changes

All email links become plain deep links with no auth data:
- Old: `/wishlist/edit?user=TOKEN`
- New: `/wishlist/edit`
- Old: `/wishlist/view?user=TOKEN&exchange=EXCHANGE_ID`
- New: `/wishlist/view?exchange=EXCHANGE_ID`

No credentials exposed in any URL. Authentication happens on the page.

### Token Recovery Email — Removed

The `api-token-email-post` endpoint and `tokenRecovery.mjs` email template are removed. Recovery is replaced by the universal `api-auth-code-post` flow — user enters their email on any page, gets a verification code, enters it, gets a session.

## 6. Email Template Changes

### Secret Santa Email

- Remove token display section (added in security hardening PR)
- Remove "save this token" message
- Update links to plain deep links (no auth data)
- Update "lost access" message to say "enter your email on the website to get a new verification code"

### Verification Code Email (New)

New email template `verificationCode.mjs` for the `api-auth-code-post` flow. Displays the 8-digit code prominently with instructions to enter it on the website. Styled consistently with other email templates.

### Notification Emails (Wishlist Notification, Wishlist Link)

- Update all links to plain deep links (no auth data in URLs)
- Remove token-dependent URL construction

### Links Module

Update `netlify/shared/links.mjs`:
- `wishlistEditPath()` — returns `/wishlist/edit` (no params)
- `wishlistViewPath(exchangeId)` — returns `/wishlist/view?exchange=EXCHANGE_ID` (no auth params)

### Project Documentation

Update `.claude/CLAUDE.md` and on-demand skills to reflect the new auth architecture:

- **CLAUDE.md** — Update "Architecture" section: remove references to token-based auth, document cookie-based JWT auth pattern, mention `requireAuth()` middleware, update endpoint naming conventions
- **`backend-conventions` skill** — Update endpoint patterns to show `requireAuth()` integration with `apiHandler`, document cookie-based auth flow, remove token-related patterns
- **`backend-testing` skill** — Document how to test authenticated endpoints (setting session cookies in test events), update `buildEvent` helper if needed to support cookie headers
- **`frontend-testing` skill** — Document how to test auth-gated pages (mocking cookie presence/absence)
- **`project-map` skill** — Update file tree to reflect renamed/new/deleted endpoint files

### Dev REPL

Update `dev/repl.mjs`:
- `userExchangeData` currently uses `wishlistEditPath(user.token)` and `wishlistViewPath(user.token, exchangeId)` — update to use the new parameterless link helpers
- Remove token lookup from query (the `token` string shortcut). Change to accept email or query object only since the token field no longer exists
- Update the example in the REPL help text accordingly
