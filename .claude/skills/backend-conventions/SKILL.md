---
name: backend-conventions
description: Backend architecture for Netlify serverless functions + MongoDB — shared modules, API endpoints, Zod 4 schema conventions
---

# Backend: Netlify Serverless Functions + MongoDB

## Shared Modules (`netlify/shared/`)

- **middleware.mjs** — `apiHandler(method, fn)` wraps handlers with method check + try/catch; `validateBody(schema, event)` parses request body against Zod schema
- **responses.mjs** — HTTP response helpers: `ok()`, `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `serverError()`, `methodNotAllowed()`
- **auth.mjs** — `extractTokenFromPath(event, afterSegment)` extracts token from URL; `getUserByToken(token)` finds user and conforms via `userSchema.parse()`
- **giverNotification.mjs** — `forEachGiverOf(user, callback)` iterates exchanges to find givers of a recipient; `sendNotificationEmail(template, to, subject, params)` sends via Netlify email function
- **db.mjs** — MongoDB connection + collection getters (`getUsersCollection`, `getExchangesCollection`, `getLegacyCollection`)
- **schemas/user.mjs** — Zod 4 schemas: `userSchema`, `wishlistSchema`, `wishItemSchema`
- **schemas/exchange.mjs** — Zod 4 schemas: `exchangeSchema`, `assignmentSchema`, `houseSchema`

## API Endpoints (`netlify/functions/`)

All `api-*` endpoints use `apiHandler` wrapper and Zod validation:

- **api-exchange-post.mjs** — Creates exchange with participants, assignments, houses. Upserts users by email. Has `.check()` refinement validating assignment names exist in participants.
- **api-user-wishlist-get.mjs** — Returns recipient wishlist data for a giver viewing an exchange
- **api-exchange-get.mjs** — Finds all exchanges for a user by email
- **api-user-get.mjs** — Returns user data (name, wishlists, wishItems) by token
- **api-user-wishlist-put.mjs** — Updates user wishlists/wishItems; notifies givers on first submission
- **api-user-contact-post.mjs** — Emails contact info to givers (not stored in DB)
- **api-giver-retry-post.mjs** — Retries failed email sends for an exchange
- **api-recipient-get.mjs** — Looks up recipient by giver email (new collections + legacy fallback)

Legacy endpoints (not refactored): `get_name.mjs`, `postToDb.mjs`

## Zod 4 Schema Conventions

- Use Zod 4 standalone types: `z.email()`, `z.uuid()`, `z.url()` (NOT deprecated `z.string().email()`)
- Use `.check(ctx => { ctx.issues.push(...) })` for custom validation (NOT deprecated `.superRefine()`)
- Do NOT use `.passthrough()` (deprecated in Zod 4)
- DB document schemas (`userSchema`, `exchangeSchema`) are shared in `netlify/shared/schemas/`
- Request body schemas are colocated in the endpoint file that uses them
- Request schemas derive from DB schemas where possible (e.g., `userSchema.pick({wishlists: true, wishItems: true})`)
- All schema variable names end with `Schema` (e.g., `exchangePostRequestSchema`, `giverNotifyRequestSchema`)
- DB lookups that return user/exchange documents should conform via `.parse()` to apply defaults
