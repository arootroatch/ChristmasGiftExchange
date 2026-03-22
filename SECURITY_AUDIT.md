# Serverless Functions Security Audit

**Date:** 2026-03-22
**Scope:** All 13 Netlify serverless functions and shared backend modules

---

## Executive Summary

The backend is well-structured with consistent patterns: Zod validation on modern endpoints, HTML escaping in email templates, token-based auth, and strong HTTP security headers. The main risks are **unauthenticated email-sending endpoints**, **legacy endpoints without validation**, and **missing rate limiting**.

---

## HIGH Severity

### 1. Legacy endpoints accept arbitrary input without validation

**Files:** `postToDb.mjs:7`, `get_name.mjs:7`

`postToDb.mjs` calls `JSON.parse(event.body)` with no schema validation and passes the result directly to `insertMany()`. An attacker can insert arbitrary documents with any fields into the `names` collection.

`get_name.mjs` uses `String(event.body).trim()` as a raw MongoDB query value — while not injectable (string equality), it lacks the `apiHandler` wrapper so there's no method check, no error alerting, and no consistent error format.

**Recommendation:** Either migrate these to use `apiHandler` + Zod validation matching the modern endpoints, or deprecate/remove them if no longer needed.

### 2. Unauthenticated email sending — api-results-email-post.mjs

**File:** `api-results-email-post.mjs:15-27`

This endpoint accepts any email address and assignment data, then sends an email via Postmark with no authentication. An attacker can:
- Send spam through your Postmark account to arbitrary addresses
- Exhaust your Postmark sending quota
- Send phishing-like emails from your domain (`alex@soundrootsproductions.com`)

**Recommendation:** Require token authentication, or verify the email belongs to a known exchange participant before sending.

### 3. Unauthenticated email sending — api-giver-retry-post.mjs

**File:** `api-giver-retry-post.mjs:19-51`

Same issue. Accepts participant/assignment data and sends batch emails with no authentication. An attacker can trigger bulk email sends to arbitrary addresses.

**Recommendation:** Require token auth or verify the exchangeId + participants exist in the database before sending.

### 4. JSON.parse without try/catch in validateBody

**File:** `middleware.mjs:17`

```js
const result = schema.safeParse(JSON.parse(event.body));
```

If `event.body` is not valid JSON, `JSON.parse` throws an unhandled exception. The global error handler in `apiHandler` catches it, but it triggers an error alert email to the admin for what is really just a bad request. Malformed requests could flood the admin inbox with error alerts.

**Recommendation:** Wrap `JSON.parse` in a try/catch and return `badRequest("Invalid JSON")`.

---

## MEDIUM Severity

### 5. api-exchange-get.mjs leaks full exchange data without authentication

**File:** `api-exchange-get.mjs:36-55`

Given any email address, this endpoint returns all exchanges for that user, including **all participant names, emails, and giver/recipient assignments**. No authentication is required — just knowing someone's email reveals their Secret Santa assignments.

**Recommendation:** Require token-based authentication instead of email-only lookup.

### 6. api-recipient-get.mjs reveals assignments without authentication

**File:** `api-recipient-get.mjs:50-61`

Given an email address, reveals the recipient name and exchange date. This defeats the purpose of "Secret" Santa for anyone whose email an attacker knows.

**Recommendation:** Require token authentication.

### 7. api-wishlist-email-post.mjs sends token-bearing URLs to unverified email

**File:** `api-wishlist-email-post.mjs:32-39`

This endpoint looks up a user by the provided email and sends them a URL containing their authentication token. While the lookup verifies the email exists in the system, an attacker who knows a participant's email can trigger sending the token-bearing URL — the email itself is the only verification.

**Recommendation:** Low risk since the email goes to the address owner, but consider rate limiting to prevent inbox flooding.

### 8. No rate limiting on any endpoint

None of the endpoints implement rate limiting. Email-sending endpoints are particularly vulnerable:
- `api-results-email-post` — unauthenticated, sends to any address
- `api-giver-retry-post` — unauthenticated, sends batch emails
- `api-user-contact-post` — authenticated but no limit on how often contact info is sent
- `api-wishlist-email-post` — triggers token-bearing email sends

**Recommendation:** Add rate limiting via Netlify's built-in rate limiting, a middleware counter, or an external service (e.g., Upstash Redis).

### 9. Error alert emails could be weaponized

**File:** `middleware.mjs:34-45`

Every unhandled error sends an email to the admin. An attacker sending malformed requests to multiple endpoints could flood the admin inbox. Combined with no rate limiting, this is a denial-of-service vector against the admin's email.

**Recommendation:** Add rate limiting or debouncing to error alert emails (e.g., max 1 alert per endpoint per minute).

### 10. postToDb.mjs — no HTTP method restriction

**File:** `postToDb.mjs:6`

The legacy `postToDb` handler doesn't use `apiHandler`, so it responds to any HTTP method (GET, POST, PUT, DELETE, etc.). This violates the principle of least privilege.

**Recommendation:** Add method checking or migrate to `apiHandler`.

---

## LOW Severity

### 11. Email preview endpoint relies solely on CONTEXT env var

**File:** `api-email-preview-get.mjs:14`

```js
if (process.env.CONTEXT !== 'dev') return {statusCode: 404};
```

If `CONTEXT` is unset or misconfigured, the email preview endpoint becomes accessible in production. It also calls `getData()` which queries the database, potentially exposing real data.

**Recommendation:** Default to blocking access when `CONTEXT` is not explicitly `'dev'`.  Current check (`!== 'dev'`) is correct for this — just ensure `CONTEXT` is always set in production.

### 12. extractTokenFromPath uses substring matching

**File:** `auth.mjs:12`

```js
const index = parts.findIndex(p => p.includes(afterSegment));
```

Using `includes()` instead of strict equality means a path segment like `superuser` would match when searching for `user`. In practice, the current URL structure makes this unexploitable, but it's fragile.

**Recommendation:** Use strict equality: `p === afterSegment`.

### 13. Duplicate MongoDB connections in legacy endpoints

**Files:** `postToDb.mjs:3-4`, `get_name.mjs:3-4`

Legacy endpoints create their own `MongoClient` instances instead of using the shared `db.mjs` module. This wastes connection pool resources in a serverless environment.

**Recommendation:** Migrate to use `getLegacyCollection()` from `db.mjs`.

### 14. Stack traces sent via email

**File:** `middleware.mjs:42`

Full stack traces (including file paths) are included in error alert emails. While these go only to the admin, if the admin email is compromised, an attacker learns internal file structure.

**Recommendation:** Acceptable for admin alerting, but consider truncating or summarizing in production.

### 15. Missing Content-Security-Policy header

**File:** `netlify.toml:17-24`

The security headers are good (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy), but there is no `Content-Security-Policy` header. CSP provides defense-in-depth against XSS.

**Recommendation:** Add a CSP header appropriate for the application (e.g., `default-src 'self'; script-src 'self'`).

---

## Positive Findings

- **Zod validation** on all modern endpoints with custom validators (unique emails, assignment integrity)
- **HTML escaping** via `escapeHtml()` in all email templates — prevents stored XSS
- **Token-based auth** using `crypto.randomUUID()` — strong entropy, not guessable
- **Schema parsing** on database reads (e.g., `userSchema.parse(doc)`) — validates data coming out of DB
- **Strong HTTP headers** — HSTS, X-Frame-Options DENY, nosniff, strict referrer, permissions policy
- **Generic error messages** to clients — `serverError("Something went wrong")` doesn't leak internals
- **Separation of concerns** — shared modules for auth, DB, responses, middleware
- **Email provider abstraction** — clean dev/production split via multimethod dispatch

---

## Priority Remediation Order

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | Wrap `JSON.parse` in try/catch in `validateBody` | 5 min |
| 2 | Add auth to `api-results-email-post` and `api-giver-retry-post` | 1-2 hrs |
| 3 | Add auth to `api-exchange-get` and `api-recipient-get` | 1-2 hrs |
| 4 | Fix `extractTokenFromPath` to use strict equality | 5 min |
| 5 | Migrate or remove legacy endpoints (`postToDb`, `get_name`) | 30 min |
| 6 | Add rate limiting to email-sending endpoints | 2-4 hrs |
| 7 | Add Content-Security-Policy header | 30 min |
| 8 | Debounce error alert emails | 1 hr |
