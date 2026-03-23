---
name: backend-conventions
description: Backend architecture for Netlify serverless functions + MongoDB — shared modules, auth middleware, API endpoints, Zod 4 schema conventions
---

# Backend: Netlify Serverless Functions + MongoDB

## Shared Modules (`netlify/shared/`)

- **middleware.mjs** — `apiHandler(method, fn, rateLimitConfig?)` wraps handlers with method check, origin validation, optional rate limiting, error alerting + try/catch; `validateBody(schema, event)` parses request body against Zod schema; `requireAuth(event)` verifies JWT session cookie and attaches `event.user`
- **responses.mjs** — HTTP response helpers: `ok()`, `okWithHeaders()`, `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `serverError()`, `tooManyRequests()`, `methodNotAllowed()`
- **jwt.mjs** — `signSession(userId)` creates signed JWT; `verifySession(token)` validates it; `buildSessionCookie(jwt)` / `clearSessionCookie()` build Set-Cookie header values; `parseCookies(cookieHeader)` parses cookie string to object
- **authCodes.mjs** — `generateAndStoreCode(email)` creates 8-digit HMAC-hashed verification code in MongoDB (10min TTL, 5 attempt limit); `verifyCode(email, code)` validates and marks used
- **rateLimit.mjs** — `checkRateLimit(ip, endpoint, config)` IP-based rate limiting via MongoDB
- **giverNotification.mjs** — `forEachGiverOf(user, callback)` iterates exchanges to find givers of a recipient; `sendNotificationEmail(template, to, subject, params)` sends via Postmark
- **emailDispatch.mjs** — Postmark API integration for sending emails
- **links.mjs** — URL builder helpers for email links
- **multimethod.mjs** — Multiple dispatch utility
- **db.mjs** — MongoDB connection + collection getters (`getUsersCollection`, `getExchangesCollection`, `getLegacyCollection`, `getAuthCodesCollection`)
- **schemas/user.mjs** — Zod 4 schemas: `userSchema`, `wishlistSchema`, `wishItemSchema`
- **schemas/exchange.mjs** — Zod 4 schemas: `exchangeSchema`, `assignmentSchema`, `houseSchema`
- **emails/** — Email template modules (layout, verificationCode, secretSanta, wishlistLink, wishlistNotification, contactInfo, resultsSummary, errorAlert, escapeHtml)

## Authentication Pattern

### Cookie-Based JWT Auth Flow
1. Client sends email to `api-auth-code-post` → server generates code, emails it (silent success even if user not found)
2. Client sends email + code to `api-auth-verify-post` → server verifies, issues JWT in `Set-Cookie` header via `okWithHeaders()`
3. Subsequent requests carry the `session` cookie automatically
4. `requireAuth(event)` in protected endpoints: parses cookie → verifies JWT → looks up user → sets `event.user`

### Protected Endpoint Pattern
```js
import {apiHandler, requireAuth} from "../shared/middleware.mjs";
import {ok} from "../shared/responses.mjs";

export const handler = apiHandler("GET", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const user = event.user; // Set by requireAuth
    return ok({name: user.name});
}, {maxRequests: 30, windowMs: 60000});
```

### Set-Cookie Response Pattern
Use `okWithHeaders()` when setting cookies (e.g., login, logout):
```js
import {okWithHeaders} from "../shared/responses.mjs";
import {buildSessionCookie} from "../shared/jwt.mjs";

return okWithHeaders({success: true}, {"Set-Cookie": buildSessionCookie(jwt)});
```

## API Endpoints (`netlify/functions/`)

All `api-*` endpoints use `apiHandler` wrapper and Zod validation:

### Auth Endpoints
- **api-auth-code-post.mjs** — Sends email verification code (rate limited: 3/min)
- **api-auth-verify-post.mjs** — Verifies code, issues JWT session cookie via `okWithHeaders()`
- **api-auth-logout-post.mjs** — Clears session cookie

### Protected Endpoints (use `requireAuth`)
- **api-user-get.mjs** — Returns authenticated user data (name, wishlists, wishItems)
- **api-user-wishlist-put.mjs** — Updates user wishlists/wishItems; notifies givers on first submission
- **api-my-exchanges-get.mjs** — Returns all exchanges for the authenticated user
- **api-results-email-post.mjs** — Sends result emails for an exchange (organizer only)
- **api-wishlist-email-post.mjs** — Sends wishlist link emails
- **api-user-contact-post.mjs** — Emails contact info to givers (not stored in DB)
- **api-giver-retry-post.mjs** — Retries failed email sends for an exchange

### Public Endpoints
- **api-exchange-post.mjs** — Creates exchange with participants, assignments, houses. Upserts users by email.
- **api-recipient-get.mjs** — Looks up recipient by giver email (new collections + legacy fallback)
- **api-email-preview-get.mjs** — Renders email template preview (dev only)

Legacy endpoints (not refactored): `get_name.mjs`, `postToDb.mjs`

## Zod 4 Schema Conventions

- Use Zod 4 standalone types: `z.email()`, `z.uuid()`, `z.url()` (NOT deprecated `z.string().email()`)
- Use `.check(ctx => { ctx.issues.push(...) })` for custom validation (NOT deprecated `.superRefine()`)
- Do NOT use `.passthrough()` (deprecated in Zod 4)
- DB document schemas (`userSchema`, `exchangeSchema`) are shared in `netlify/shared/schemas/`
- Request body schemas are colocated in the endpoint file that uses them
- Request schemas derive from DB schemas where possible (e.g., `userSchema.pick({wishlists: true, wishItems: true})`)
- All schema variable names end with `Schema` (e.g., `exchangePostRequestSchema`, `wishlistPutRequestSchema`)
- DB lookups that return user/exchange documents should conform via `.parse()` to apply defaults
