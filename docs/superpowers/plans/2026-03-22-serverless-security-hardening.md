# Serverless Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden all serverless endpoints with token-based auth, organizer identity, rate limiting, and defense-in-depth fixes.

**Architecture:** Introduce an organizer user created before exchange submission, migrate all endpoints from email/URL-based auth to POST-body token auth, add MongoDB-backed rate limiting middleware, and remove legacy code. Frontend changes include a new organizer screen, token input fields (password type), and URL sanitization.

**Tech Stack:** Vanilla JS, Vite, Vitest + jsdom, Netlify Functions, MongoDB, Zod 4, Postmark

**Spec:** `docs/superpowers/specs/2026-03-22-serverless-security-hardening-design.md`

**Skills:** @backend-conventions, @backend-testing, @frontend-testing

**Notes:**
- All new backend tests standardize on importing `buildEvent`, `makeUser`, `makeExchange` from `spec/shared/testFactories.js` rather than defining them inline (departure from some older tests, but DRY).
- When testing endpoints that go through `apiHandler` with rate limiting, pass `headers: {"x-forwarded-for": "127.0.0.1"}` in the event object so the rate limiter gets a real IP instead of `"unknown"`.

---

## File Structure

### New Files
- `netlify/functions/api-organizer-post.mjs` — Upserts organizer user, returns token
- `netlify/functions/api-my-exchanges-post.mjs` — Token-based exchange lookup (replaces api-exchange-get)
- `netlify/functions/api-recipient-post.mjs` — Token-based recipient lookup (replaces api-recipient-get)
- `netlify/functions/api-token-email-post.mjs` — "Forgot my token" recovery endpoint
- `netlify/functions/api-user-post.mjs` — Token-based user data fetch (replaces api-user-get)
- `netlify/functions/api-user-wishlist-view-post.mjs` — Token-based wishlist view (replaces api-user-wishlist-get)
- `netlify/functions/api-user-wishlist-save-post.mjs` — Token-based wishlist save (replaces api-user-wishlist-put)
- `netlify/shared/rateLimit.mjs` — Rate limiting middleware
- `netlify/shared/emails/tokenRecovery.mjs` — Token recovery email template
- `spec/netlify-functions/api-organizer-post.spec.js` — Unit tests
- `spec/netlify-functions/api-my-exchanges-post.spec.js` — Unit tests
- `spec/netlify-functions/api-recipient-post.spec.js` — Unit tests
- `spec/netlify-functions/api-token-email-post.spec.js` — Unit tests
- `spec/netlify-functions/api-user-post.spec.js` — Unit tests
- `spec/netlify-functions/api-user-wishlist-view-post.spec.js` — Unit tests
- `spec/netlify-functions/api-user-wishlist-save-post.spec.js` — Unit tests
- `spec/netlify-functions/rateLimit.spec.js` — Unit tests
- `spec/integration/api-organizer-post.contract.spec.js` — Contract tests
- `src/exchange/components/OrganizerForm.js` — Organizer name/email capture component

### Modified Files
- `netlify/shared/middleware.mjs` — Add try/catch to validateBody JSON.parse, integrate rate limiting
- `netlify/shared/auth.mjs:12` — Fix extractTokenFromPath includes() → strict equality
- `netlify/shared/db.mjs:28-31` — Remove getLegacyCollection()
- `netlify/shared/schemas/exchange.mjs:16-24` — Add organizer field to exchangeSchema
- `netlify/shared/responses.mjs` — Add tooManyRequests() response helper
- `netlify/functions/api-exchange-post.mjs:60-67,115-133` — Add token auth, add organizer to exchange doc
- `netlify/functions/api-results-email-post.mjs` — Rewrite: token auth, server-side data lookup
- `netlify/functions/api-giver-retry-post.mjs` — Rewrite: token auth, server-side data lookup
- `netlify/functions/api-wishlist-email-post.mjs:8-11,20` — Change from email to token lookup
- `netlify/functions/api-user-contact-post.mjs:13-14` — Move token from path to body
- `netlify/shared/giverNotification.mjs:31-52` — Update sendBatchEmails to pass token for email template
- `netlify/shared/emails/secretSanta.mjs` — Add token display and save message
- `netlify/shared/links.mjs` — No changes needed (used server-side for email links)
- `netlify.toml:17-24` — Add CSP header
- `src/exchange/state.js` — Add organizer state fields and events
- `src/exchange/components/EmailTable/EmailTable.js:154-182` — Add token to API calls
- `src/exchange/components/EmailTable/SendResults.js:55-112` — Remove name/email collection, use organizer state
- `src/exchange/components/RecipientSearch.js:60-91` — Change to token-based POST calls
- `src/reuse.js:5-27` — Change to token-based POST call
- `src/wishlistEdit/index.js:10-30` — URL sanitization, change to POST call
- `src/wishlistEdit/components/SaveButton.js:19-34` — Change to POST call with token in body
- `src/wishlistEdit/components/ContactForm.js:23-52` — Move token from path to body
- `src/wishlistView.js:4-60` — URL sanitization, change to POST call

### Deleted Files
- `netlify/functions/postToDb.mjs`
- `netlify/functions/get_name.mjs`
- `netlify/functions/api-exchange-get.mjs`
- `netlify/functions/api-recipient-get.mjs`
- `netlify/functions/api-user-get.mjs`
- `netlify/functions/api-user-wishlist-get.mjs`
- `netlify/functions/api-user-wishlist-put.mjs`

---

## Task 1: Fix validateBody JSON.parse (Quick Win)

**Files:**
- Modify: `netlify/shared/middleware.mjs:16-22`
- Test: `spec/netlify-functions/middleware.spec.js` (create if not exists)

- [ ] **Step 1: Write failing test for malformed JSON**

**IMPORTANT:** `spec/netlify-functions/middleware.spec.js` already exists with `apiHandler` tests. Append this new describe block to the existing file — do NOT overwrite it.

```js
// ADD to existing spec/netlify-functions/middleware.spec.js
import {validateBody} from "../../netlify/shared/middleware.mjs";
import {z} from "zod";

const schema = z.object({name: z.string()});

describe("validateBody", () => {
    it("returns error for malformed JSON", () => {
        const event = {body: "not valid json{"};
        const {data, error} = validateBody(schema, event);
        expect(data).toBeUndefined();
        expect(error).toBe("Invalid JSON");
    });

    it("returns error for null body", () => {
        const event = {body: null};
        const {data, error} = validateBody(schema, event);
        expect(data).toBeUndefined();
        expect(error).toBe("Invalid JSON");
    });

    it("returns parsed data for valid JSON", () => {
        const event = {body: JSON.stringify({name: "test"})};
        const {data, error} = validateBody(schema, event);
        expect(error).toBeUndefined();
        expect(data).toEqual({name: "test"});
    });

    it("returns Zod validation error for invalid schema", () => {
        const event = {body: JSON.stringify({name: 123})};
        const {data, error} = validateBody(schema, event);
        expect(data).toBeUndefined();
        expect(error).toBeDefined();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/netlify-functions/middleware.spec.js`
Expected: FAIL — "malformed JSON" and "null body" tests throw unhandled errors

- [ ] **Step 3: Implement try/catch in validateBody**

In `netlify/shared/middleware.mjs`, replace the `validateBody` function (lines 16-22):

```js
export function validateBody(schema, event) {
    let parsed;
    try {
        parsed = JSON.parse(event.body);
    } catch {
        return {error: "Invalid JSON"};
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
        return {error: formatZodError(result.error)};
    }
    return {data: result.data};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/netlify-functions/middleware.spec.js`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/middleware.mjs spec/netlify-functions/middleware.spec.js
git commit -m "fix: wrap validateBody JSON.parse in try/catch to return 400 on malformed JSON"
```

---

## Task 2: Add CSP Header and Delete Legacy Endpoints

**Files:**
- Modify: `netlify.toml:17-24`
- Delete: `netlify/functions/postToDb.mjs`, `netlify/functions/get_name.mjs`
- Modify: `netlify/shared/db.mjs:28-31`

- [ ] **Step 1: Add CSP header to netlify.toml**

Add to the existing `[[headers]]` section in `netlify.toml` (after line 22, before the closing of headers):

```toml
Content-Security-Policy = "default-src 'self'; script-src 'self' https://cdnjs.buymeacoffee.com https://kit.fontawesome.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://ka-f.fontawesome.com; connect-src 'self' https://ka-f.fontawesome.com https://cdnjs.buymeacoffee.com; img-src 'self' data: https://cdn.buymeacoffee.com https://img.buymeacoffee.com; frame-src 'none'; object-src 'none'; base-uri 'self'"
```

- [ ] **Step 2: Delete legacy endpoint files and their tests**

```bash
rm netlify/functions/postToDb.mjs netlify/functions/get_name.mjs
rm spec/netlify-functions/postToDb.spec.js spec/netlify-functions/get_name.spec.js
```

- [ ] **Step 3: Remove getLegacyCollection from db.mjs**

Remove lines 28-31 from `netlify/shared/db.mjs`:

```js
// DELETE these lines:
export async function getLegacyCollection() {
    const db = await getDb();
    return db.collection("names");
}
```

- [ ] **Step 4: Verify no remaining references to legacy code**

Run: `grep -r "getLegacyCollection\|get_name\|postToDb\|legacy" netlify/ spec/ --include="*.mjs" --include="*.js"`
Expected: Only the `api-recipient-get.mjs` legacy fallback (replaced in Task 7) and possibly its spec file

- [ ] **Step 5: Run existing tests to ensure nothing breaks**

Run: `npx vitest run`
Expected: All existing tests PASS (no tests depend on legacy endpoints)

- [ ] **Step 6: Commit**

```bash
git add netlify.toml netlify/shared/db.mjs
git rm netlify/functions/postToDb.mjs netlify/functions/get_name.mjs spec/netlify-functions/postToDb.spec.js spec/netlify-functions/get_name.spec.js
git commit -m "chore: add CSP header, delete legacy endpoints, remove getLegacyCollection"
```

---

## Task 3: Add tooManyRequests Response and Rate Limiting Middleware

**Files:**
- Modify: `netlify/shared/responses.mjs`
- Create: `netlify/shared/rateLimit.mjs`
- Modify: `netlify/shared/db.mjs` — Add getRateLimitsCollection()
- Modify: `netlify/shared/middleware.mjs:24-48` — Integrate rate limiting into apiHandler
- Test: `spec/netlify-functions/rateLimit.spec.js`

- [ ] **Step 1: Add tooManyRequests to responses.mjs**

Add after `serverError` in `netlify/shared/responses.mjs`:

```js
export function tooManyRequests(msg) {
    return error(429, msg);
}
```

- [ ] **Step 2: Add getRateLimitsCollection to db.mjs**

Add after `getExchangesCollection` in `netlify/shared/db.mjs`:

```js
export async function getRateLimitsCollection() {
    const db = await getDb();
    return db.collection("rateLimits");
}
```

- [ ] **Step 3: Write failing tests for rate limiter**

```js
// spec/netlify-functions/rateLimit.spec.js
import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";

describe("rateLimit", () => {
    let client, db, mongo, checkRateLimit;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const mod = await import("../../netlify/shared/rateLimit.mjs");
        checkRateLimit = mod.checkRateLimit;
    });

    afterEach(async () => {
        await cleanCollections(db, "rateLimits");
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it("allows requests under the limit", async () => {
        const result = await checkRateLimit("127.0.0.1", "api-test", {maxRequests: 5, windowMs: 60000});
        expect(result).toBeNull();
    });

    it("returns 429 response when limit exceeded", async () => {
        for (let i = 0; i < 3; i++) {
            await checkRateLimit("127.0.0.1", "api-test", {maxRequests: 3, windowMs: 60000});
        }
        const result = await checkRateLimit("127.0.0.1", "api-test", {maxRequests: 3, windowMs: 60000});
        expect(result).not.toBeNull();
        expect(result.statusCode).toBe(429);
    });

    it("tracks different IPs separately", async () => {
        for (let i = 0; i < 3; i++) {
            await checkRateLimit("127.0.0.1", "api-test", {maxRequests: 3, windowMs: 60000});
        }
        const result = await checkRateLimit("192.168.1.1", "api-test", {maxRequests: 3, windowMs: 60000});
        expect(result).toBeNull();
    });

    it("tracks different endpoints separately", async () => {
        for (let i = 0; i < 3; i++) {
            await checkRateLimit("127.0.0.1", "api-a", {maxRequests: 3, windowMs: 60000});
        }
        const result = await checkRateLimit("127.0.0.1", "api-b", {maxRequests: 3, windowMs: 60000});
        expect(result).toBeNull();
    });

    it("resets after window expires", async () => {
        const col = db.collection("rateLimits");
        // Insert an expired window
        await col.insertOne({
            key: "127.0.0.1:api-test",
            endpoint: "api-test",
            count: 10,
            windowStart: new Date(Date.now() - 120000), // 2 minutes ago
        });
        const result = await checkRateLimit("127.0.0.1", "api-test", {maxRequests: 3, windowMs: 60000});
        expect(result).toBeNull();
    });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/rateLimit.spec.js`
Expected: FAIL — module not found

- [ ] **Step 5: Implement checkRateLimit**

```js
// netlify/shared/rateLimit.mjs
import {getRateLimitsCollection} from "./db.mjs";
import {tooManyRequests} from "./responses.mjs";

export async function checkRateLimit(ip, endpoint, {maxRequests = 30, windowMs = 60000} = {}) {
    const col = await getRateLimitsCollection();
    const key = `${ip}:${endpoint}`;
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const result = await col.findOneAndUpdate(
        {key, windowStart: {$gt: windowStart}},
        {$inc: {count: 1}},
        {returnDocument: "after"}
    );

    if (result) {
        if (result.count > maxRequests) {
            return tooManyRequests("Rate limit exceeded");
        }
        return null;
    }

    // No current window — delete any expired entry and create new one
    await col.deleteMany({key});
    await col.insertOne({key, endpoint, count: 1, windowStart: now});
    return null;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/rateLimit.spec.js`
Expected: All 5 tests PASS

- [ ] **Step 7: Integrate rate limiting into apiHandler**

Modify `apiHandler` in `netlify/shared/middleware.mjs` to accept a rate limit config and run the check before the handler. The updated signature becomes `apiHandler(method, fn, rateLimitConfig)`:

```js
import {checkRateLimit} from "./rateLimit.mjs";

export function apiHandler(method, fn, rateLimitConfig) {
    return async (event) => {
        if (event.httpMethod !== method) {
            return methodNotAllowed();
        }
        setRequestOrigin(event);

        if (rateLimitConfig) {
            const ip = event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim()
                || event.headers?.["client-ip"]
                || "unknown";
            const endpoint = event.path.split("/").pop();
            const limited = await checkRateLimit(ip, endpoint, rateLimitConfig);
            if (limited) return limited;
        }

        try {
            return await fn(event);
        } catch (error) {
            console.error("Unhandled error in API handler:", error);
            try {
                await sendNotificationEmail(
                    "error-alert",
                    "alex@soundrootsproductions.com",
                    `Server Error: ${error.message}`,
                    {
                        endpoint: `${event.httpMethod} ${event.path}`,
                        timestamp: new Date().toISOString(),
                        stackTrace: error.stack || error.message,
                    }
                );
            } catch {}
            return serverError("Something went wrong");
        }
    };
}
```

- [ ] **Step 8: Run all tests to ensure existing endpoints still work**

Run: `npx vitest run`
Expected: All tests PASS (existing endpoints don't pass rateLimitConfig, so rate limiting is skipped)

- [ ] **Step 9: Commit**

```bash
git add netlify/shared/rateLimit.mjs netlify/shared/responses.mjs netlify/shared/db.mjs netlify/shared/middleware.mjs spec/netlify-functions/rateLimit.spec.js
git commit -m "feat: add MongoDB-based rate limiting middleware with tiered configuration"
```

---

## Task 4: Add Organizer Field to Exchange Schema

**Files:**
- Modify: `netlify/shared/schemas/exchange.mjs:16-24`

- [ ] **Step 1: Check for existing tests of the exchange schema**

Run: `grep -r "exchangeSchema" spec/ --include="*.js" -l`
Identify any tests that construct exchange docs and may need updating.

- [ ] **Step 2: Add organizer to exchangeSchema**

In `netlify/shared/schemas/exchange.mjs`, add `organizer` to the schema (after `exchangeId`):

```js
export const exchangeSchema = z.object({
    _id: objectIdSchema.optional(),
    exchangeId: z.string(),
    organizer: objectIdSchema.optional(),
    createdAt: z.date(),
    isSecretSanta: z.boolean(),
    houses: z.array(houseSchema),
    participants: z.array(objectIdSchema),
    assignments: z.array(assignmentSchema),
});
```

- [ ] **Step 3: Update any test factories that build exchange docs**

Check `spec/shared/testFactories.js` — if `makeExchange` doesn't include `organizer`, add it:

```js
export function makeExchange({exchangeId, organizer, participants, assignments, houses, isSecretSanta, createdAt} = {}) {
    return {
        exchangeId: exchangeId || "test-exchange-id",
        organizer: organizer || new ObjectId(),
        // ...rest of existing defaults
    };
}
```

- [ ] **Step 4: Run all tests to check for breakage**

Run: `npx vitest run`
Expected: Some tests may fail if they construct exchange docs without `organizer`. Fix any failures by adding `organizer` to test data.

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/schemas/exchange.mjs spec/shared/testFactories.js
git commit -m "feat: add organizer field to exchange schema"
```

---

## Task 5: Create api-organizer-post Endpoint

**Files:**
- Create: `netlify/functions/api-organizer-post.mjs`
- Test: `spec/netlify-functions/api-organizer-post.spec.js`

- [ ] **Step 1: Write failing tests**

```js
// spec/netlify-functions/api-organizer-post.spec.js
import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";
import {buildEvent} from "../shared/testFactories.js";

describe("api-organizer-post", () => {
    let client, db, handler, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const mod = await import("../../netlify/functions/api-organizer-post.mjs");
        handler = mod.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "rateLimits");
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it("rejects non-POST requests", async () => {
        const event = buildEvent("GET");
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("rejects missing name", async () => {
        const event = buildEvent("POST", {body: {email: "test@test.com"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it("rejects missing email", async () => {
        const event = buildEvent("POST", {body: {name: "Test"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it("rejects invalid email", async () => {
        const event = buildEvent("POST", {body: {name: "Test", email: "not-an-email"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it("creates new user and returns token", async () => {
        const event = buildEvent("POST", {body: {name: "Alex", email: "alex@test.com"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.token).toBeDefined();
        expect(body.token).toMatch(/^[0-9a-f-]{36}$/);

        const user = await db.collection("users").findOne({email: "alex@test.com"});
        expect(user.name).toBe("Alex");
        expect(user.token).toBe(body.token);
    });

    it("returns existing token for existing user", async () => {
        const event = buildEvent("POST", {body: {name: "Alex", email: "alex@test.com"}});
        const response1 = await handler(event);
        const token1 = JSON.parse(response1.body).token;

        const response2 = await handler(event);
        const token2 = JSON.parse(response2.body).token;

        expect(token1).toBe(token2);
    });

    it("updates name for existing user", async () => {
        const event1 = buildEvent("POST", {body: {name: "Alex", email: "alex@test.com"}});
        await handler(event1);

        const event2 = buildEvent("POST", {body: {name: "Alexander", email: "alex@test.com"}});
        await handler(event2);

        const user = await db.collection("users").findOne({email: "alex@test.com"});
        expect(user.name).toBe("Alexander");
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/api-organizer-post.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement api-organizer-post**

```js
// netlify/functions/api-organizer-post.mjs
import {z} from "zod";
import crypto from "crypto";
import {getUsersCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, ok} from "../shared/responses.mjs";

const organizerRequestSchema = z.object({
    name: z.string(),
    email: z.email(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(organizerRequestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOneAndUpdate(
        {email: data.email},
        {
            $set: {name: data.name, email: data.email},
            $setOnInsert: {
                token: crypto.randomUUID(),
                wishlists: [],
                wishItems: [],
            },
        },
        {upsert: true, returnDocument: "after"}
    );

    return ok({token: user.token});
}, {maxRequests: 30, windowMs: 60000});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-organizer-post.spec.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-organizer-post.mjs spec/netlify-functions/api-organizer-post.spec.js
git commit -m "feat: add api-organizer-post endpoint to upsert organizer user and return token"
```

---

## Task 6: Add Token Auth to api-exchange-post

**Files:**
- Modify: `netlify/functions/api-exchange-post.mjs:60-67,115-133`
- Modify: existing tests in `spec/netlify-functions/api-exchange-post.spec.js`
- Modify: existing contract tests in `spec/integration/api-exchange-post.contract.spec.js`

- [ ] **Step 1: Write failing test for token auth**

Add to the existing test file `spec/netlify-functions/api-exchange-post.spec.js`:

```js
it("rejects request without token", async () => {
    const event = buildEvent("POST", {body: exchangePayloadWithoutToken});
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
});

it("rejects request with invalid token", async () => {
    const payload = {...exchangePayload, token: "invalid-token-xyz"};
    const event = buildEvent("POST", {body: payload});
    const response = await handler(event);
    expect(response.statusCode).toBe(401);
});

it("stores organizer ObjectId on exchange document", async () => {
    // Pre-create organizer user
    const organizer = makeUser({name: "Organizer", email: "org@test.com"});
    await db.collection("users").insertOne(organizer);

    const payload = {...exchangePayload, token: organizer.token};
    const event = buildEvent("POST", {body: payload});
    const response = await handler(event);
    expect(response.statusCode).toBe(200);

    const exchange = await db.collection("exchanges").findOne({exchangeId: payload.exchangeId});
    expect(exchange.organizer.equals(organizer._id)).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

Run: `npx vitest run spec/netlify-functions/api-exchange-post.spec.js`
Expected: New token-related tests FAIL

- [ ] **Step 3: Add token to request schema and handler**

In `netlify/functions/api-exchange-post.mjs`:

Add `token` to the request schema:
```js
const exchangePostRequestSchema = z.object({
    token: z.string(),
    exchangeId: z.string(),
    // ...rest unchanged
});
```

Update the handler (line 115+) to verify token and add organizer:
```js
export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(exchangePostRequestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const organizer = await usersCol.findOne({token: data.token});
    if (!organizer) return unauthorized("Invalid token");

    const exchangesCol = await getExchangesCollection();

    const userMap = await upsertParticipants(usersCol, data.participants);
    const exchangeDoc = buildExchangeDoc(data.exchangeId, data.isSecretSanta, data.houses, data.participants, data.assignments, userMap);
    exchangeDoc.organizer = organizer._id;
    await exchangesCol.insertOne(exchangeDoc);

    // ...rest of email sending unchanged

    return ok({...buildResponse(data.exchangeId, data.participants), emailsFailed});
}, {maxRequests: 30, windowMs: 60000});
```

Add `unauthorized` to imports from responses.mjs.

- [ ] **Step 4: Update existing tests to include token**

All existing tests that call `handler` with a valid exchange payload need to pre-create an organizer user and include `token` in the body. Update the test setup and test data accordingly.

- [ ] **Step 5: Run all tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-exchange-post.spec.js`
Expected: All tests PASS

- [ ] **Step 6: Update contract tests**

Update `spec/integration/api-exchange-post.contract.spec.js` to include token in the request contract and verify `organizer` is not leaked in the response.

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add netlify/functions/api-exchange-post.mjs spec/netlify-functions/api-exchange-post.spec.js spec/integration/api-exchange-post.contract.spec.js
git commit -m "feat: add token auth to api-exchange-post, store organizer on exchange document"
```

---

## Task 7: Create api-recipient-post (Replaces api-recipient-get)

**Files:**
- Create: `netlify/functions/api-recipient-post.mjs`
- Delete: `netlify/functions/api-recipient-get.mjs`
- Test: `spec/netlify-functions/api-recipient-post.spec.js`

- [ ] **Step 1: Write failing tests**

```js
// spec/netlify-functions/api-recipient-post.spec.js
import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";
import {buildEvent, makeUser, makeExchange} from "../shared/testFactories.js";

describe("api-recipient-post", () => {
    let client, db, handler, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const mod = await import("../../netlify/functions/api-recipient-post.mjs");
        handler = mod.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "exchanges", "rateLimits");
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it("rejects non-POST requests", async () => {
        const event = buildEvent("GET");
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("rejects missing token", async () => {
        const event = buildEvent("POST", {body: {}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it("returns 401 for invalid token", async () => {
        const event = buildEvent("POST", {body: {token: "invalid"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it("returns recipient name for valid token", async () => {
        const giver = makeUser({name: "Alex", email: "alex@test.com"});
        const recipient = makeUser({name: "Whitney", email: "whitney@test.com"});
        await db.collection("users").insertMany([giver, recipient]);

        const exchange = makeExchange({
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        });
        await db.collection("exchanges").insertOne(exchange);

        const event = buildEvent("POST", {body: {token: giver.token}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.recipient).toBe("Whitney");
        expect(body.giverName).toBe("Alex");
        expect(body.exchangeId).toBe(exchange.exchangeId);
    });

    it("returns 404 when user has no exchanges", async () => {
        const user = makeUser({name: "Alex", email: "alex@test.com"});
        await db.collection("users").insertOne(user);

        const event = buildEvent("POST", {body: {token: user.token}});
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/api-recipient-post.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement api-recipient-post**

```js
// netlify/functions/api-recipient-post.mjs
import {z} from "zod";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest, unauthorized, notFound} from "../shared/responses.mjs";

const requestSchema = z.object({
    token: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    const user = await usersCol.findOne({token: data.token});
    if (!user) return unauthorized("Invalid token");

    const exchange = await exchangesCol
        .find({participants: user._id})
        .sort({createdAt: -1})
        .limit(1)
        .toArray();

    if (exchange.length === 0) return notFound("No exchanges found");

    const latestExchange = exchange[0];
    const assignment = latestExchange.assignments.find(a => a.giverId.equals(user._id));
    if (!assignment) return notFound("No assignment found");

    const recipient = await usersCol.findOne({_id: assignment.recipientId});
    if (!recipient) return notFound("Recipient not found");

    return ok({
        giverName: user.name,
        recipient: recipient.name,
        date: latestExchange.createdAt,
        exchangeId: latestExchange.exchangeId,
    });
}, {maxRequests: 30, windowMs: 60000});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-recipient-post.spec.js`
Expected: All tests PASS

- [ ] **Step 5: Delete api-recipient-get.mjs**

```bash
rm netlify/functions/api-recipient-get.mjs
```

- [ ] **Step 6: Remove any tests for api-recipient-get**

Delete or rename `spec/netlify-functions/api-recipient-get.spec.js` if it exists.

- [ ] **Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 8: Commit**

```bash
git add netlify/functions/api-recipient-post.mjs spec/netlify-functions/api-recipient-post.spec.js
git rm netlify/functions/api-recipient-get.mjs
git commit -m "feat: replace api-recipient-get with token-authenticated api-recipient-post"
```

---

## Task 8: Create api-my-exchanges-post (Replaces api-exchange-get)

**Files:**
- Create: `netlify/functions/api-my-exchanges-post.mjs`
- Delete: `netlify/functions/api-exchange-get.mjs`
- Test: `spec/netlify-functions/api-my-exchanges-post.spec.js`

- [ ] **Step 1: Write failing tests**

```js
// spec/netlify-functions/api-my-exchanges-post.spec.js
import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";
import {buildEvent, makeUser, makeExchange} from "../shared/testFactories.js";

describe("api-my-exchanges-post", () => {
    let client, db, handler, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const mod = await import("../../netlify/functions/api-my-exchanges-post.mjs");
        handler = mod.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "exchanges", "rateLimits");
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it("rejects non-POST requests", async () => {
        const event = buildEvent("GET");
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("returns 401 for invalid token", async () => {
        const event = buildEvent("POST", {body: {token: "invalid"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it("returns exchanges without assignments", async () => {
        const user = makeUser({name: "Alex", email: "alex@test.com"});
        const other = makeUser({name: "Whitney", email: "whitney@test.com"});
        await db.collection("users").insertMany([user, other]);

        const exchange = makeExchange({
            participants: [user._id, other._id],
            assignments: [{giverId: user._id, recipientId: other._id}],
            houses: [{name: "House A", members: [user._id]}],
        });
        await db.collection("exchanges").insertOne(exchange);

        const event = buildEvent("POST", {body: {token: user.token}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toHaveLength(1);
        expect(body[0].assignments).toBeUndefined();
        expect(body[0].participantNames).toContain("Alex");
        expect(body[0].participantNames).toContain("Whitney");
        expect(body[0].participants).toEqual(
            expect.arrayContaining([
                expect.objectContaining({name: "Alex", email: "alex@test.com"}),
            ])
        );
        expect(body[0].houses).toBeDefined();
        expect(body[0].isSecretSanta).toBeDefined();
        expect(body[0].exchangeId).toBeDefined();
    });

    it("returns empty array when user has no exchanges", async () => {
        const user = makeUser({name: "Alex", email: "alex@test.com"});
        await db.collection("users").insertOne(user);

        const event = buildEvent("POST", {body: {token: user.token}});
        const response = await handler(event);
        const body = JSON.parse(response.body);
        expect(body).toEqual([]);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/api-my-exchanges-post.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement api-my-exchanges-post**

```js
// netlify/functions/api-my-exchanges-post.mjs
import {z} from "zod";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest, unauthorized} from "../shared/responses.mjs";

const requestSchema = z.object({
    token: z.string(),
});

async function enrichExchange(exchange, usersCol) {
    const participantUsers = await usersCol
        .find({_id: {$in: exchange.participants}})
        .toArray();

    const userIdToName = {};
    participantUsers.forEach(u => {
        userIdToName[u._id.toString()] = u.name;
    });

    return {
        exchangeId: exchange.exchangeId,
        createdAt: exchange.createdAt,
        isSecretSanta: exchange.isSecretSanta,
        participantNames: exchange.participants.map(id => userIdToName[id.toString()]),
        houses: exchange.houses.map(h => ({
            name: h.name,
            members: h.members.map(id => userIdToName[id.toString()]),
        })),
        participants: participantUsers.map(u => ({
            name: u.name,
            email: u.email,
        })),
    };
}

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({token: data.token});
    if (!user) return unauthorized("Invalid token");

    const exchangesCol = await getExchangesCollection();
    const exchanges = await exchangesCol
        .find({participants: user._id})
        .sort({createdAt: -1})
        .toArray();

    if (exchanges.length === 0) return ok([]);

    const results = await Promise.all(exchanges.map(ex => enrichExchange(ex, usersCol)));
    return ok(results);
}, {maxRequests: 30, windowMs: 60000});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-my-exchanges-post.spec.js`
Expected: All tests PASS

- [ ] **Step 5: Delete api-exchange-get.mjs and its tests**

```bash
rm netlify/functions/api-exchange-get.mjs
```

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add netlify/functions/api-my-exchanges-post.mjs spec/netlify-functions/api-my-exchanges-post.spec.js
git rm netlify/functions/api-exchange-get.mjs
git commit -m "feat: replace api-exchange-get with token-authenticated api-my-exchanges-post, strip assignments from response"
```

---

## Task 9: Rewrite api-results-email-post with Organizer Auth

**Files:**
- Modify: `netlify/functions/api-results-email-post.mjs`
- Update: `spec/netlify-functions/api-results-email-post.spec.js`

- [ ] **Step 1: Write failing tests for new auth flow**

```js
// Update or replace spec/netlify-functions/api-results-email-post.spec.js
it("rejects request without token", async () => {
    const event = buildEvent("POST", {body: {exchangeId: "test-123"}});
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
});

it("rejects invalid token", async () => {
    const event = buildEvent("POST", {body: {token: "invalid", exchangeId: "test-123"}});
    const response = await handler(event);
    expect(response.statusCode).toBe(401);
});

it("rejects non-organizer token", async () => {
    const organizer = makeUser({name: "Organizer", email: "org@test.com"});
    const participant = makeUser({name: "Participant", email: "part@test.com"});
    await db.collection("users").insertMany([organizer, participant]);

    const exchange = makeExchange({
        organizer: organizer._id,
        participants: [organizer._id, participant._id],
        assignments: [{giverId: organizer._id, recipientId: participant._id}],
    });
    await db.collection("exchanges").insertOne(exchange);

    const event = buildEvent("POST", {body: {token: participant.token, exchangeId: exchange.exchangeId}});
    const response = await handler(event);
    expect(response.statusCode).toBe(403);
});

it("sends results email to organizer using server-side data", async () => {
    const organizer = makeUser({name: "Organizer", email: "org@test.com"});
    const other = makeUser({name: "Other", email: "other@test.com"});
    await db.collection("users").insertMany([organizer, other]);

    const exchange = makeExchange({
        organizer: organizer._id,
        participants: [organizer._id, other._id],
        assignments: [
            {giverId: organizer._id, recipientId: other._id},
            {giverId: other._id, recipientId: organizer._id},
        ],
    });
    await db.collection("exchanges").insertOne(exchange);

    const event = buildEvent("POST", {body: {token: organizer.token, exchangeId: exchange.exchangeId}});
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    // Verify sendNotificationEmail was called with organizer email and assignments from DB
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/api-results-email-post.spec.js`
Expected: FAIL

- [ ] **Step 3: Rewrite api-results-email-post**

```js
// netlify/functions/api-results-email-post.mjs
import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, ok, unauthorized, forbidden, notFound} from "../shared/responses.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";

const requestSchema = z.object({
    token: z.string(),
    exchangeId: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({token: data.token});
    if (!user) return unauthorized("Invalid token");

    const exchangesCol = await getExchangesCollection();
    const exchange = await exchangesCol.findOne({exchangeId: data.exchangeId});
    if (!exchange) return notFound("Exchange not found");

    if (!exchange.organizer.equals(user._id)) {
        return forbidden("Only the organizer can send results emails");
    }

    // Build assignments from DB data
    const participantIds = [...new Set(exchange.assignments.flatMap(a => [a.giverId, a.recipientId]))];
    const participants = await usersCol.find({_id: {$in: participantIds}}).toArray();
    const idToName = {};
    participants.forEach(p => { idToName[p._id.toString()] = p.name; });

    const assignments = exchange.assignments.map(a => ({
        giver: idToName[a.giverId.toString()],
        recipient: idToName[a.recipientId.toString()],
    }));

    await sendNotificationEmail(
        "results-summary",
        user.email,
        "Your Gift Exchange Results",
        {name: user.name, assignments}
    );

    return ok({success: true});
}, {maxRequests: 5, windowMs: 60000});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-results-email-post.spec.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-results-email-post.mjs spec/netlify-functions/api-results-email-post.spec.js
git commit -m "feat: rewrite api-results-email-post with organizer auth and server-side data lookup"
```

---

## Task 10: Rewrite api-giver-retry-post with Organizer Auth

**Files:**
- Modify: `netlify/functions/api-giver-retry-post.mjs`
- Update: `spec/netlify-functions/api-giver-retry-post.spec.js`

- [ ] **Step 1: Write failing tests for new auth flow**

Similar pattern to Task 10. Tests should verify:
- Rejects missing/invalid token
- Rejects non-organizer token
- Looks up participants and assignments from DB
- Accepts optional `participantEmails` array to filter retries
- Validates that provided `participantEmails` exist in the exchange
- Sends batch emails using server-side data

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/api-giver-retry-post.spec.js`
Expected: FAIL

- [ ] **Step 3: Rewrite api-giver-retry-post**

```js
// netlify/functions/api-giver-retry-post.mjs
import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest, unauthorized, forbidden, notFound} from "../shared/responses.mjs";
import {sendNotificationEmail, sendBatchEmails} from "../shared/giverNotification.mjs";
import {getUsersCollection, getExchangesCollection} from "../shared/db.mjs";

const requestSchema = z.object({
    token: z.string(),
    exchangeId: z.string(),
    participantEmails: z.array(z.email()).optional(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({token: data.token});
    if (!user) return unauthorized("Invalid token");

    const exchangesCol = await getExchangesCollection();
    const exchange = await exchangesCol.findOne({exchangeId: data.exchangeId});
    if (!exchange) return notFound("Exchange not found");

    if (!exchange.organizer.equals(user._id)) {
        return forbidden("Only the organizer can retry emails");
    }

    // Look up all participants from DB
    const allParticipants = await usersCol
        .find({_id: {$in: exchange.participants}})
        .toArray();

    const idToUser = {};
    allParticipants.forEach(p => { idToUser[p._id.toString()] = p; });

    // Build participants and assignments from DB
    let participants = allParticipants.map(p => ({name: p.name, email: p.email}));
    let assignments = exchange.assignments.map(a => ({
        giver: idToUser[a.giverId.toString()].name,
        recipient: idToUser[a.recipientId.toString()].name,
    }));

    // Filter to subset if participantEmails provided
    if (data.participantEmails) {
        const emailSet = new Set(data.participantEmails.map(e => e.toLowerCase()));
        const validEmails = new Set(allParticipants.map(p => p.email.toLowerCase()));
        for (const email of emailSet) {
            if (!validEmails.has(email)) {
                return badRequest(`Email ${email} is not a participant in this exchange`);
            }
        }
        participants = participants.filter(p => emailSet.has(p.email.toLowerCase()));
        const nameSet = new Set(participants.map(p => p.name));
        assignments = assignments.filter(a => nameSet.has(a.giver));
    }

    const userByEmail = {};
    allParticipants.forEach(p => { userByEmail[p.email] = p; });

    const {emailsFailed} = await sendBatchEmails(participants, assignments, userByEmail, data.exchangeId);

    const sent = assignments.length - emailsFailed.length;

    if (emailsFailed.length > 0) {
        try {
            await sendNotificationEmail(
                "error-alert",
                "alex@soundrootsproductions.com",
                "Gift Exchange - Email Send Failures",
                {
                    endpoint: "api-giver-retry-post",
                    timestamp: new Date().toISOString(),
                    stackTrace: `Failed to send emails to:\n${emailsFailed.join('\n')}`,
                }
            );
        } catch (err) {
            console.error("Failed to send error-alert email:", err);
        }
    }

    return ok({sent, total: assignments.length, emailsFailed});
}, {maxRequests: 5, windowMs: 60000});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-giver-retry-post.spec.js`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-giver-retry-post.mjs spec/netlify-functions/api-giver-retry-post.spec.js
git commit -m "feat: rewrite api-giver-retry-post with organizer auth and server-side data lookup"
```

---

## Task 11: Update api-wishlist-email-post to Token Auth

**Files:**
- Modify: `netlify/functions/api-wishlist-email-post.mjs`
- Update: existing tests

- [ ] **Step 1: Write failing test for token-based auth**

```js
it("rejects request with email instead of token", async () => {
    const event = buildEvent("POST", {body: {email: "test@test.com", exchangeId: "123"}});
    const response = await handler(event);
    expect(response.statusCode).toBe(400);
});

it("looks up user by token instead of email", async () => {
    // Setup giver, recipient, exchange in DB
    const event = buildEvent("POST", {body: {token: giver.token, exchangeId: exchange.exchangeId}});
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Update the endpoint**

Change request schema from `{email, exchangeId}` to `{token, exchangeId}`. Replace `usersCol.findOne({email})` with `usersCol.findOne({token: data.token})`. Add rate limiting config `{maxRequests: 5, windowMs: 60000}`.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-wishlist-email-post.mjs spec/
git commit -m "feat: update api-wishlist-email-post to use token auth instead of email"
```

---

## Task 12: Create api-user-post (Replaces api-user-get)

**Files:**
- Create: `netlify/functions/api-user-post.mjs`
- Delete: `netlify/functions/api-user-get.mjs`
- Test: `spec/netlify-functions/api-user-post.spec.js`

- [ ] **Step 1: Write failing tests**

Test: rejects non-POST, rejects missing token, returns 401 for invalid token, returns user data (name, wishlists, wishItems) for valid token. No token in URL path.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement api-user-post**

```js
// netlify/functions/api-user-post.mjs
import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest, unauthorized} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";

const requestSchema = z.object({
    token: z.string(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({token: data.token});
    if (!user) return unauthorized("User not found");

    return ok({
        name: user.name,
        wishlists: user.wishlists,
        wishItems: user.wishItems,
    });
}, {maxRequests: 30, windowMs: 60000});
```

- [ ] **Step 4: Run tests, delete old file**

```bash
rm netlify/functions/api-user-get.mjs
```

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-user-post.mjs spec/netlify-functions/api-user-post.spec.js
git rm netlify/functions/api-user-get.mjs
git commit -m "feat: replace api-user-get with token-in-body api-user-post"
```

---

## Task 13: Create api-user-wishlist-view-post (Replaces api-user-wishlist-get)

**Files:**
- Create: `netlify/functions/api-user-wishlist-view-post.mjs`
- Delete: `netlify/functions/api-user-wishlist-get.mjs`
- Test: `spec/netlify-functions/api-user-wishlist-view-post.spec.js`

- [ ] **Step 1: Write failing tests**

Test: rejects non-POST, requires `{token, exchangeId}` in body, verifies giver access (token user must be giver in exchange), returns recipient's wishlist data.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement**

Same logic as current `api-user-wishlist-get.mjs` but reads token from `validateBody` instead of query string. Uses `apiHandler("POST", ...)` with rate limit `{maxRequests: 30, windowMs: 60000}`.

- [ ] **Step 4: Delete old file, run tests**

```bash
rm netlify/functions/api-user-wishlist-get.mjs
```

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-user-wishlist-view-post.mjs spec/netlify-functions/api-user-wishlist-view-post.spec.js
git rm netlify/functions/api-user-wishlist-get.mjs
git commit -m "feat: replace api-user-wishlist-get with token-in-body api-user-wishlist-view-post"
```

---

## Task 14: Create api-user-wishlist-save-post (Replaces api-user-wishlist-put)

**Files:**
- Create: `netlify/functions/api-user-wishlist-save-post.mjs`
- Delete: `netlify/functions/api-user-wishlist-put.mjs`
- Test: `spec/netlify-functions/api-user-wishlist-save-post.spec.js`

- [ ] **Step 1: Write failing tests**

Test: rejects non-POST, requires `{token, wishlists, wishItems}` in body, verifies user exists, saves wishlists, triggers giver notifications when first wishlist added.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement**

Same logic as current `api-user-wishlist-put.mjs` but reads token from `validateBody` body instead of URL path. Uses `apiHandler("POST", ...)` with rate limit `{maxRequests: 30, windowMs: 60000}`.

- [ ] **Step 4: Delete old file, run tests**

```bash
rm netlify/functions/api-user-wishlist-put.mjs
```

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-user-wishlist-save-post.mjs spec/netlify-functions/api-user-wishlist-save-post.spec.js
git rm netlify/functions/api-user-wishlist-put.mjs
git commit -m "feat: replace api-user-wishlist-put with token-in-body api-user-wishlist-save-post"
```

---

## Task 15: Update api-user-contact-post to Token in Body

**Files:**
- Modify: `netlify/functions/api-user-contact-post.mjs`
- Update: existing tests

- [ ] **Step 1: Write failing test for token in body**

Test that token comes from request body `{token, address?, phone?, notes?}` instead of URL path.

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Update endpoint**

Change from `extractTokenFromPath(event, "user")` to reading token from `validateBody`. Add `token: z.string()` to the Zod schema. Replace `getUserByToken(token)` with `usersCol.findOne({token: data.token})`. Add rate limit `{maxRequests: 5, windowMs: 60000}`.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-user-contact-post.mjs spec/
git commit -m "feat: move token from URL path to request body in api-user-contact-post"
```

---

## Task 16: Fix extractTokenFromPath Strict Matching

**Why deferred:** This fix changes `includes()` to `===`, which would break any caller using a substring match (e.g., passing `"user"` to match `"api-user-contact-post"`). By this point, all callers that used `extractTokenFromPath` have been migrated to token-in-body and the old endpoint files deleted. The function is now only used internally and this fix prevents future misuse.

**Files:**
- Modify: `netlify/shared/auth.mjs:10-16`
- Test: `spec/netlify-functions/auth.spec.js` (create)

- [ ] **Step 1: Write failing test for partial match**

```js
// spec/netlify-functions/auth.spec.js
import {describe, it, expect} from "vitest";
import {extractTokenFromPath} from "../../netlify/shared/auth.mjs";

describe("extractTokenFromPath", () => {
    it("extracts token after exact segment match", () => {
        const event = {path: "/.netlify/functions/api-user-get/abc-123"};
        expect(extractTokenFromPath(event, "api-user-get")).toBe("abc-123");
    });

    it("does not match partial segment names", () => {
        const event = {path: "/.netlify/functions/api-user-get/abc-123"};
        expect(extractTokenFromPath(event, "user")).toBeNull();
    });

    it("returns null when segment not found", () => {
        const event = {path: "/.netlify/functions/api-other/abc-123"};
        expect(extractTokenFromPath(event, "api-user-get")).toBeNull();
    });

    it("returns null when no token after segment", () => {
        const event = {path: "/.netlify/functions/api-user-get"};
        expect(extractTokenFromPath(event, "api-user-get")).toBeNull();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/netlify-functions/auth.spec.js`
Expected: FAIL — "does not match partial segment names" returns "abc-123" instead of null

- [ ] **Step 3: Change includes() to strict equality**

In `netlify/shared/auth.mjs`, replace lines 10-16:

```js
export function extractTokenFromPath(event, afterSegment) {
    const parts = event.path.split("/");
    const index = parts.findIndex(p => p === afterSegment);
    if (index === -1 || index + 1 >= parts.length) {
        return null;
    }
    return parts[index + 1] || null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/netlify-functions/auth.spec.js`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/auth.mjs spec/netlify-functions/auth.spec.js
git commit -m "fix: use strict equality in extractTokenFromPath to prevent partial segment matching"
```

---

## Task 17: Create api-token-email-post (Forgot Token Recovery)

**Files:**
- Create: `netlify/functions/api-token-email-post.mjs`
- Create: `netlify/shared/emails/tokenRecovery.mjs`
- Test: `spec/netlify-functions/api-token-email-post.spec.js`

- [ ] **Step 1: Write token recovery email template**

```js
// netlify/shared/emails/tokenRecovery.mjs
import {layout} from './layout.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({name, token, wishlistEditUrl}) {
    return layout(`
    <tr>
        <td align="center" style="padding-top: 50px; padding-bottom: 30px; font-size: 36px; color: #69292a;">
            Hi ${escapeHtml(name)}!
        </td>
    </tr>
    <tr>
        <td align="center" style="font-size: 18px; padding: 0 50px 30px; color: #555;">
            You requested your Gift Exchange token. Here it is:
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0 50px 30px;">
            <span style="display: inline-block; font-size: 16px; font-family: monospace; color: #198c0a; font-weight: bold; padding: 16px 24px;
                         background: #fff; border-radius: 10px; border: 2px solid #198c0a;
                         box-shadow: 0 2px 8px rgba(0,0,0,0.08); word-break: break-all;">
                ${escapeHtml(token)}
            </span>
        </td>
    </tr>
    <tr>
        <td align="center" style="font-size: 16px; padding: 0 50px 30px; color: #555;">
            Use this token to look up your gift exchange recipient on the website. Save it somewhere safe!
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0 50px 30px;">
            <a href="${escapeHtml(wishlistEditUrl)}"
               style="display: inline-block; padding: 12px 28px; background-color: #198c0a;
                      color: white; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: bold;">
                Edit Your Wishlist
            </a>
        </td>
    </tr>`);
}
```

- [ ] **Step 2: Write failing tests for the endpoint**

```js
// spec/netlify-functions/api-token-email-post.spec.js
it("returns {sent: true} for existing user", async () => {
    const user = makeUser({name: "Alex", email: "alex@test.com"});
    await db.collection("users").insertOne(user);

    const event = buildEvent("POST", {body: {email: "alex@test.com"}});
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({sent: true});
    // Verify sendNotificationEmail was called with token-recovery template
});

it("returns {sent: true} for non-existent email (anti-enumeration)", async () => {
    const event = buildEvent("POST", {body: {email: "nobody@test.com"}});
    const response = await handler(event);
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({sent: true});
    // Verify sendNotificationEmail was NOT called
});
```

- [ ] **Step 3: Implement api-token-email-post**

```js
// netlify/functions/api-token-email-post.mjs
import {z} from "zod";
import {getUsersCollection} from "../shared/db.mjs";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";
import {wishlistEditPath, absoluteUrl} from "../shared/links.mjs";

const requestSchema = z.object({
    email: z.email(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({email: data.email.trim()});

    if (user) {
        const wishlistEditUrl = absoluteUrl(wishlistEditPath(user.token));
        await sendNotificationEmail(
            "token-recovery",
            user.email,
            "Your Gift Exchange Token",
            {name: user.name, token: user.token, wishlistEditUrl}
        );
    }

    return ok({sent: true});
}, {maxRequests: 3, windowMs: 60000});
```

- [ ] **Step 4: Register the template in emailDispatch**

If the email dispatch system requires template registration (check `emailProviders/postmark.mjs` for how templates are loaded), add `token-recovery` to the template map.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-token-email-post.spec.js`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add netlify/functions/api-token-email-post.mjs netlify/shared/emails/tokenRecovery.mjs spec/netlify-functions/api-token-email-post.spec.js
git commit -m "feat: add api-token-email-post for forgotten token recovery with anti-enumeration"
```

---

## Task 18: Update Secret Santa Email to Display Token

**Files:**
- Modify: `netlify/shared/emails/secretSanta.mjs:5,56-80`
- Modify: `netlify/shared/giverNotification.mjs:31-49` — Pass token to template
- Test: existing email template tests if any, or add new

- [ ] **Step 1: Write failing test**

Test that the rendered email HTML contains the token string and a save message.

- [ ] **Step 2: Update secretSanta.mjs render function**

Add `token` to the destructured parameters. Add a token display section before the existing "If you lose this email" paragraph:

```js
export function render({name, recipient, token, wishlistEditUrl, wishlistViewUrl}) {
    // ...existing CTA code...

    const tokenSection = token ? `
    <tr>
        <td align="center" style="padding: 20px 50px; font-size: 16px; color: #555;">
            <strong>Your personal token:</strong>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0 50px 10px;">
            <span style="display: inline-block; font-size: 14px; font-family: monospace; color: #198c0a; font-weight: bold; padding: 12px 20px;
                         background: #fff; border-radius: 8px; border: 2px solid #198c0a;
                         box-shadow: 0 2px 8px rgba(0,0,0,0.08); word-break: break-all;">
                ${escapeHtml(token)}
            </span>
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 10px 50px 30px; font-size: 14px; color: #999;">
            Save this token! You'll need it to look up your recipient on the website if you lose this email.
        </td>
    </tr>` : '';

    // Insert tokenSection before the closing "retrieve" paragraph
    return layout(`
    ...existing layout...
    ${wishlistCtas}
    ${tokenSection}
    <tr>
        <td align="center" style="padding: 30px 50px; font-size: 16px; color: #999;">
            If you lose this email and your token, you can
            <a href="https://giftexchangegenerator.netlify.app/" style="color: #69292a;">request a new token</a>
            using your email address.
        </td>
    </tr>`);
}
```

- [ ] **Step 3: Update sendBatchEmails to pass token**

In `netlify/shared/giverNotification.mjs`, update the `sendBatchEmails` function (line 31+) to include `token` in the parameters:

```js
parameters: {
    name: assignment.giver,
    recipient: assignment.recipient,
    token: user ? user.token : null,
    wishlistEditUrl,
    wishlistViewUrl,
},
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/emails/secretSanta.mjs netlify/shared/giverNotification.mjs
git commit -m "feat: display user token and save message in Secret Santa email"
```

---

## Task 19: Add Organizer State to Frontend

**Files:**
- Modify: `src/exchange/state.js`
- Test: `spec/exchange/state.spec.js` (if exists) or add tests

- [ ] **Step 1: Add organizer fields and events to state**

In `src/exchange/state.js`, add to the state object:

```js
organizerName: "",
organizerEmail: "",
organizerToken: "",
```

Add new event constant:
```js
export const ORGANIZER_SET = "ORGANIZER_SET";
```

Add state mutation function:
```js
export function setOrganizer(name, email, token) {
    state.organizerName = name;
    state.organizerEmail = email;
    state.organizerToken = token;
    localStorage.setItem("organizerToken", token);
    exchangeEvents.emit(ORGANIZER_SET, {...state});
}
```

Add accessor:
```js
export function getOrganizerToken() {
    return state.organizerToken || localStorage.getItem("organizerToken") || "";
}
```

Update `startExchange` to reset organizer fields.

- [ ] **Step 2: Write tests for new state functions**

- [ ] **Step 3: Run tests to verify they pass**

- [ ] **Step 4: Commit**

```bash
git add src/exchange/state.js spec/
git commit -m "feat: add organizer state fields and ORGANIZER_SET event"
```

---

## Task 20: Create OrganizerForm Component

**Files:**
- Create: `src/exchange/components/OrganizerForm.js`
- Test: `spec/exchange/components/OrganizerForm.spec.js`
- Modify: `src/exchange/index.js` — Import and init

- [ ] **Step 1: Write failing tests**

Test that:
- OrganizerForm renders on RECIPIENTS_ASSIGNED event (before EmailTable)
- Form has name input, email input (both required), and submit button
- On submit, calls `api-organizer-post` with `{name, email}`
- On success, calls `setOrganizer(name, email, token)` and emits ORGANIZER_SET
- EmailTable listens to ORGANIZER_SET instead of (or in addition to) RECIPIENTS_ASSIGNED

- [ ] **Step 2: Implement OrganizerForm**

The component subscribes to `RECIPIENTS_ASSIGNED`, renders a form (same visual style as EmailTable), and on submit calls `api-organizer-post`. On success it calls `setOrganizer()` which emits `ORGANIZER_SET`.

- [ ] **Step 3: Update EmailTable to listen to ORGANIZER_SET**

In `src/exchange/components/EmailTable/EmailTable.js`, change the `RECIPIENTS_ASSIGNED` listener to `ORGANIZER_SET` for the Secret Santa path. The ORGANIZER_SET event means "organizer is identified, proceed with email collection."

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/exchange/components/OrganizerForm.js spec/exchange/components/OrganizerForm.spec.js src/exchange/components/EmailTable/EmailTable.js src/exchange/index.js
git commit -m "feat: add OrganizerForm component that captures organizer before EmailTable"
```

---

## Task 21: Update EmailTable to Use Organizer Token

**Files:**
- Modify: `src/exchange/components/EmailTable/EmailTable.js:154-182`
- Update: `spec/exchange/components/EmailTable/EmailTable.spec.js`

- [ ] **Step 1: Write failing test**

Test that `submitEmails` includes `token` from `getOrganizerToken()` in the POST body to `api-exchange-post`.

- [ ] **Step 2: Update submitEmails**

In the `submitEmails` function (around line 154), add token to the request body:

```js
apiFetch("/.netlify/functions/api-exchange-post", {
    method: "POST",
    body: {...payload, token: getOrganizerToken()},
    onSuccess: (data) => handleEmailResponse(data, payload),
    onError: (msg) => showErrorSnackbar(msg),
});
```

- [ ] **Step 3: Update submitSubsetEmails for retry**

In the retry function (around line 169), change to send `{token, exchangeId, participantEmails}`:

```js
apiFetch("/.netlify/functions/api-giver-retry-post", {
    method: "POST",
    body: {
        token: getOrganizerToken(),
        exchangeId: payload.exchangeId,
        participantEmails: failedParticipants.map(p => p.email),
    },
    onSuccess: ...,
    onError: ...,
});
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/exchange/components/EmailTable/EmailTable.js spec/exchange/components/EmailTable/EmailTable.spec.js
git commit -m "feat: add organizer token to api-exchange-post and api-giver-retry-post calls"
```

---

## Task 22: Update SendResults to Use Organizer State

**Files:**
- Modify: `src/exchange/components/EmailTable/SendResults.js:55-112`
- Update: `spec/exchange/components/EmailTable/SendResults.spec.js`

- [ ] **Step 1: Write failing test**

Test that SendResults no longer renders name/email inputs and instead sends `{token, exchangeId}` using the organizer token from state.

- [ ] **Step 2: Simplify SendResults**

Remove the results form that collects name/email. The flow becomes:
1. Confirmation modal (unchanged)
2. On "Continue", directly call `api-results-email-post` with `{token: getOrganizerToken(), exchangeId}`
3. No name/email form needed

- [ ] **Step 3: Run tests to verify they pass**

- [ ] **Step 4: Commit**

```bash
git add src/exchange/components/EmailTable/SendResults.js spec/
git commit -m "feat: simplify SendResults to use organizer token instead of collecting name/email"
```

---

## Task 23: Update RecipientSearch to Token-Based POST

**Files:**
- Modify: `src/exchange/components/RecipientSearch.js:60-91`
- Update: `spec/exchange/components/RecipientSearch.spec.js`

- [ ] **Step 1: Write failing tests**

Test that:
- Input is `type="password"` with label "Enter your token"
- `getName` calls `api-recipient-post` with `{token}` in POST body
- `sendWishlistEmail` calls `api-wishlist-email-post` with `{token, exchangeId}` in POST body

- [ ] **Step 2: Update RecipientSearch**

Change the email input to a password-type token input. Update `getName` to POST to `api-recipient-post` with `{token}`. Update `sendWishlistEmail` to POST with `{token, exchangeId}` where token was entered by the user.

- [ ] **Step 3: Run tests to verify they pass**

- [ ] **Step 4: Commit**

```bash
git add src/exchange/components/RecipientSearch.js spec/exchange/components/RecipientSearch.spec.js
git commit -m "feat: update RecipientSearch to use token-based POST endpoints"
```

---

## Task 24: Update Reuse Feature to Token-Based POST

**Files:**
- Modify: `src/reuse.js:5-27`
- Update: `spec/reuse.spec.js`

- [ ] **Step 1: Write failing test**

Test that the input is `type="password"`, and `searchExchanges` calls `api-my-exchanges-post` with `{token}` in POST body.

- [ ] **Step 2: Update reuse.js**

Change email input to password-type token input. Update `searchExchanges` to POST to `api-my-exchanges-post` with `{token}`.

- [ ] **Step 3: Run tests to verify they pass**

- [ ] **Step 4: Commit**

```bash
git add src/reuse.js spec/reuse.spec.js
git commit -m "feat: update reuse feature to use token-based api-my-exchanges-post"
```

---

## Task 25: Update Wishlist Edit Page — URL Sanitization and POST

**Files:**
- Modify: `src/wishlistEdit/index.js:10-30`
- Modify: `src/wishlistEdit/components/SaveButton.js:19-34`
- Modify: `src/wishlistEdit/components/ContactForm.js:23-52`
- Update: relevant tests

- [ ] **Step 1: Write failing tests**

Test that:
- Token is read from URL then `history.replaceState` is called to strip it
- `loadUser` calls `api-user-post` with `{token}` in POST body
- `SaveButton` calls `api-user-wishlist-save-post` with `{token, wishlists, wishItems}` in POST body
- `ContactForm` calls `api-user-contact-post` with `{token, address, phone, notes}` in POST body (no token in URL)

- [ ] **Step 2: Update wishlistEdit/index.js**

```js
const params = new URLSearchParams(window.location.search);
const token = params.get("user");
history.replaceState(null, '', window.location.pathname);
```

Change the API call from GET to POST:
```js
apiFetch("/.netlify/functions/api-user-post", {
    method: "POST",
    body: {token},
    onSuccess: (data) => setUserData(data),
    onError: () => { /* redirect or show error */ },
});
```

- [ ] **Step 3: Update SaveButton.js**

Change from PUT with token in URL to POST with token in body:
```js
apiFetch("/.netlify/functions/api-user-wishlist-save-post", {
    method: "POST",
    body: {token, wishlists: userData.wishlists, wishItems: userData.wishItems},
    // ...
});
```

The `token` variable needs to be accessible — pass it through state or module scope.

- [ ] **Step 4: Update ContactForm.js**

Change from POST with token in URL to POST with token in body:
```js
apiFetch("/.netlify/functions/api-user-contact-post", {
    method: "POST",
    body: {token, address, phone, notes},
    // ...
});
```

- [ ] **Step 5: Run tests to verify they pass**

- [ ] **Step 6: Commit**

```bash
git add src/wishlistEdit/ spec/
git commit -m "feat: sanitize token from URL bar, move all wishlist edit API calls to token-in-body POST"
```

---

## Task 26: Update Wishlist View Page — URL Sanitization and POST

**Files:**
- Modify: `src/wishlistView.js:4-60`
- Update: `spec/wishlistView.spec.js`

- [ ] **Step 1: Write failing tests**

Test that:
- Token and exchangeId are read from URL then `history.replaceState` strips them
- API call is POST to `api-user-wishlist-view-post` with `{token, exchangeId}` in body

- [ ] **Step 2: Update wishlistView.js**

```js
const params = new URLSearchParams(window.location.search);
const token = params.get("user");
const exchangeId = params.get("exchange");
history.replaceState(null, '', window.location.pathname);
```

Change API call:
```js
apiFetch("/.netlify/functions/api-user-wishlist-view-post", {
    method: "POST",
    body: {token, exchangeId},
    onSuccess: (data) => { /* render wishlists */ },
    onError: (msg) => { /* show error */ },
});
```

- [ ] **Step 3: Run tests to verify they pass**

- [ ] **Step 4: Commit**

```bash
git add src/wishlistView.js spec/wishlistView.spec.js
git commit -m "feat: sanitize token from URL bar, change wishlist view to token-in-body POST"
```

---

## Task 27: Add Rate Limiting to All Existing Endpoints

**Files:**
- Modify: All endpoint files that don't yet have rate limit config

- [ ] **Step 1: Audit all endpoints for rate limit config**

Check each endpoint file. Add the appropriate rate limit tier:
- Email-sending endpoints: `{maxRequests: 5, windowMs: 60000}`
- All others: `{maxRequests: 30, windowMs: 60000}`

Endpoints to check:
- `api-user-post.mjs` — standard (30/min)
- `api-user-wishlist-view-post.mjs` — standard (30/min)
- `api-user-wishlist-save-post.mjs` — standard (30/min)
- `api-user-contact-post.mjs` — tight (5/min, sends email)
- `api-email-preview-get.mjs` — **skip** (dev-only, gated by CONTEXT env var)

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add netlify/functions/
git commit -m "feat: add rate limiting to all remaining endpoints"
```

---

## Task 28: Update Contract Tests and Run Full Suite

**Files:**
- Update: All contract test files in `spec/integration/`

- [ ] **Step 1: Update all contract tests**

Update request contracts to match new request shapes (token in body, no email in query). Update response contracts to verify assignments are stripped from exchange lookups and tokens are never leaked.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add spec/
git commit -m "test: update all contract tests for new token-based API contracts"
```

---

## Task 29: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Verify no tokens leak in responses**

Grep all endpoint files to confirm no response includes `.token`:
```bash
grep -n "\.token" netlify/functions/*.mjs
```
Only `api-organizer-post.mjs` should return a token.

- [ ] **Step 3: Verify all endpoints have rate limiting**

```bash
grep -L "maxRequests" netlify/functions/api-*.mjs
```
Expected: Only `api-email-preview-get.mjs` (dev-only, acceptable)

- [ ] **Step 4: Verify legacy files are gone**

```bash
ls netlify/functions/postToDb.mjs netlify/functions/get_name.mjs netlify/functions/api-exchange-get.mjs netlify/functions/api-recipient-get.mjs netlify/functions/api-user-get.mjs netlify/functions/api-user-wishlist-get.mjs netlify/functions/api-user-wishlist-put.mjs 2>&1
```
Expected: All "No such file or directory"

- [ ] **Step 5: Verify CSP header is in netlify.toml**

```bash
grep "Content-Security-Policy" netlify.toml
```
Expected: Full CSP directive present
