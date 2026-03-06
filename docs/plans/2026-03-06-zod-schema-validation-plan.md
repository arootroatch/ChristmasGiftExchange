# Zod Schema Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Zod schema validation to Netlify API functions — centralized data shapes, request body validation, and DB document conforming.

**Architecture:** Zod schemas in `netlify/shared/schemas/` define User and Exchange document shapes. A `validateBody` helper in middleware.mjs validates request bodies. `getUserByToken` in auth.mjs conforms User docs via `userSchema.parse()`. Request body schemas are colocated in the endpoint files that use them.

**Tech Stack:** Zod, Vitest, MongoDB (existing)

**Design doc:** `docs/plans/2026-03-06-zod-schema-validation-design.md`

---

### Task 1: Install Zod and Create Schema Files

**Files:**
- Modify: `package.json`
- Create: `netlify/shared/schemas/user.mjs`
- Create: `netlify/shared/schemas/exchange.mjs`

**Step 1: Install Zod**

Run: `npm install zod`

**Step 2: Create user schema**

Create `netlify/shared/schemas/user.mjs`:

```js
import {z} from "zod";

export const wishlistSchema = z.object({
    url: z.string(),
    title: z.string(),
});

export const wishItemSchema = z.object({
    url: z.string(),
    title: z.string(),
});

export const userSchema = z.object({
    _id: z.any().optional(),
    name: z.string(),
    email: z.string(),
    token: z.string(),
    wishlists: z.array(wishlistSchema).default([]),
    wishItems: z.array(wishItemSchema).default([]),
}).passthrough();
```

Note: `.passthrough()` allows extra fields from MongoDB (like `__v`) without stripping them. `email` uses `z.string()` (not `.email()`) because existing DB data may not be perfectly formatted and this schema is for conforming, not strict input validation.

**Step 3: Create exchange schema**

Create `netlify/shared/schemas/exchange.mjs`:

```js
import {z} from "zod";

export const assignmentSchema = z.object({
    giverId: z.any(),
    recipientId: z.any(),
});

export const houseSchema = z.object({
    name: z.string(),
    members: z.array(z.any()),
});

export const exchangeSchema = z.object({
    _id: z.any().optional(),
    exchangeId: z.string(),
    createdAt: z.date(),
    isSecretSanta: z.boolean(),
    houses: z.array(houseSchema),
    participants: z.array(z.any()),
    assignments: z.array(assignmentSchema),
}).passthrough();
```

**Step 4: Run existing tests to verify nothing broke**

Run: `npx vitest run tests/netlify-functions/`
Expected: All 71 tests pass (schemas aren't imported yet)

**Step 5: Commit**

```
feat: add Zod user and exchange schemas
```

---

### Task 2: Add validateBody and formatZodError to middleware, update ok()

**Files:**
- Modify: `netlify/shared/middleware.mjs`
- Modify: `netlify/shared/responses.mjs`

**Step 1: Update `ok()` to default to empty object**

In `netlify/shared/responses.mjs`, change line 1:

```js
// Before:
export function ok(data) {

// After:
export function ok(data = {}) {
```

**Step 2: Add `formatZodError` and `validateBody` to middleware.mjs**

Add to `netlify/shared/middleware.mjs`:

```js
export function formatZodError(zodError) {
    const issue = zodError.issues[0];
    const path = issue.path.join(".");
    if (issue.code === "invalid_type" && issue.received === "undefined") {
        return `Missing required field: ${path}`;
    }
    if (issue.code === "invalid_type") {
        return `Expected ${issue.expected} for ${path}, got ${issue.received}`;
    }
    return issue.message;
}

export function validateBody(schema, event) {
    const result = schema.safeParse(JSON.parse(event.body));
    if (!result.success) {
        return {error: formatZodError(result.error)};
    }
    return {data: result.data};
}
```

**Step 3: Run existing tests**

Run: `npx vitest run tests/netlify-functions/`
Expected: All 71 tests pass (nothing imports these yet)

**Step 4: Commit**

```
feat: add validateBody helper and formatZodError to middleware
```

---

### Task 3: Conform User Documents via getUserByToken

**Files:**
- Modify: `netlify/shared/auth.mjs`
- Modify: `netlify/functions/api-user-get.mjs`

**Step 1: Update `getUserByToken` to conform with userSchema**

In `netlify/shared/auth.mjs`:

```js
import {getUsersCollection} from "./db.mjs";
import {userSchema} from "./schemas/user.mjs";

export async function getUserByToken(token) {
    const usersCol = await getUsersCollection();
    const doc = await usersCol.findOne({token});
    return doc ? userSchema.parse(doc) : null;
}

export function extractTokenFromPath(event, afterSegment) {
    const parts = event.path.split("/");
    const index = parts.indexOf(afterSegment);
    if (index === -1 || index + 1 >= parts.length) {
        return null;
    }
    return parts[index + 1] || null;
}
```

**Step 2: Remove `|| []` fallbacks from api-user-get.mjs**

In `netlify/functions/api-user-get.mjs`, change the return:

```js
// Before:
    return ok({
        name: user.name,
        wishlists: user.wishlists || [],
        wishItems: user.wishItems || [],
    });

// After:
    return ok({
        name: user.name,
        wishlists: user.wishlists,
        wishItems: user.wishItems,
    });
```

**Step 3: Run tests for affected handlers**

Run: `npx vitest run tests/netlify-functions/api-user-get.spec.js tests/netlify-functions/api-user-wishlist-put.spec.js tests/netlify-functions/api-user-contact-post.spec.js`
Expected: All pass (userSchema.parse() applies same defaults that `|| []` did)

**Step 4: Commit**

```
feat: conform user documents via userSchema.parse() in getUserByToken
```

---

### Task 4: Conform User Documents in api-exchange-get

**Files:**
- Modify: `netlify/functions/api-exchange-get.mjs`

**Step 1: Import userSchema and conform recipient**

In `netlify/functions/api-exchange-get.mjs`:

```js
// Add import:
import {userSchema} from "../shared/schemas/user.mjs";

// Change recipient lookup (line 22-23):
// Before:
    const recipient = await usersCol.findOne({_id: assignment.recipientId});
    if (!recipient) return notFound("Recipient not found");

// After:
    const doc = await usersCol.findOne({_id: assignment.recipientId});
    if (!doc) return notFound("Recipient not found");
    const recipient = userSchema.parse(doc);
```

**Step 2: Remove `|| []` fallbacks from the return**

```js
// Before:
    return ok({
        recipientName: recipient.name,
        wishlists: recipient.wishlists || [],
        wishItems: recipient.wishItems || [],
    });

// After:
    return ok({
        recipientName: recipient.name,
        wishlists: recipient.wishlists,
        wishItems: recipient.wishItems,
    });
```

**Step 3: Run tests**

Run: `npx vitest run tests/netlify-functions/api-exchange-get.spec.js`
Expected: All 5 tests pass

**Step 4: Commit**

```
feat: conform recipient user document in api-exchange-get
```

---

### Task 5: Conform User Documents in api-recipient-get

**Files:**
- Modify: `netlify/functions/api-recipient-get.mjs`

**Step 1: Import userSchema and conform recipient in lookupFromNewCollections**

In `netlify/functions/api-recipient-get.mjs`:

```js
// Add import:
import {userSchema} from "../shared/schemas/user.mjs";

// In lookupFromNewCollections, change recipient lookup (line 24):
// Before:
    const recipient = await usersCol.findOne({_id: assignment.recipientId});

// After:
    const doc = await usersCol.findOne({_id: assignment.recipientId});
    const recipient = doc ? userSchema.parse(doc) : null;
```

**Step 2: Simplify hasWishlist check**

Since `recipient.wishlists` and `recipient.wishItems` are now guaranteed arrays:

```js
// Before:
    const hasWishlist = recipient &&
        ((recipient.wishlists && recipient.wishlists.length > 0) ||
            (recipient.wishItems && recipient.wishItems.length > 0));

// After:
    const hasWishlist = recipient &&
        (recipient.wishlists.length > 0 || recipient.wishItems.length > 0);
```

**Step 3: Run tests**

Run: `npx vitest run tests/netlify-functions/api-recipient-get.spec.js`
Expected: All 7 tests pass

**Step 4: Commit**

```
feat: conform recipient user document in api-recipient-get
```

---

### Task 6: Add Request Body Validation to api-exchange-post

**Files:**
- Modify: `netlify/functions/api-exchange-post.mjs`
- Modify: `tests/netlify-functions/api-exchange-post.spec.js`

**Step 1: Write failing test for invalid body**

Add to `tests/netlify-functions/api-exchange-post.spec.js`:

```js
    it('returns 400 for missing required fields', async () => {
        const event = buildEvent({isSecretSanta: true});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toContain('Missing required field');
    });
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/netlify-functions/api-exchange-post.spec.js`
Expected: New test FAILS (currently no validation, throws 500 instead of 400)

**Step 3: Add schema and validation to api-exchange-post.mjs**

Add at the top of `netlify/functions/api-exchange-post.mjs` (after imports):

```js
import {z} from "zod";
import {validateBody} from "../shared/middleware.mjs";
import {badRequest} from "../shared/responses.mjs";

const participantInputSchema = z.object({
    name: z.string(),
    email: z.string(),
});

const assignmentInputSchema = z.object({
    giver: z.string(),
    recipient: z.string(),
});

const houseInputSchema = z.object({
    id: z.string().optional(),
    name: z.string(),
    members: z.array(z.string()),
});

const exchangePostBody = z.object({
    exchangeId: z.string(),
    isSecretSanta: z.boolean(),
    houses: z.array(houseInputSchema),
    participants: z.array(participantInputSchema),
    assignments: z.array(assignmentInputSchema),
});
```

Replace the handler's manual destructure with validateBody:

```js
export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(exchangePostBody, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const exchangesCol = await getExchangesCollection();

    const userMap = await upsertParticipants(usersCol, data.participants);
    const exchangeDoc = buildExchangeDoc(data.exchangeId, data.isSecretSanta, data.houses, data.participants, data.assignments, userMap);
    await exchangesCol.insertOne(exchangeDoc);

    return ok(buildResponse(data.exchangeId, data.participants, userMap));
});
```

**Step 4: Run all exchange-post tests**

Run: `npx vitest run tests/netlify-functions/api-exchange-post.spec.js`
Expected: All 8 tests pass (7 existing + 1 new)

**Step 5: Commit**

```
feat: add Zod request body validation to api-exchange-post
```

---

### Task 7: Add Request Body Validation to api-user-wishlist-put

**Files:**
- Modify: `netlify/functions/api-user-wishlist-put.mjs`
- Modify: `tests/netlify-functions/api-user-wishlist-put.spec.js`

**Step 1: Write failing test for invalid body**

Add to `tests/netlify-functions/api-user-wishlist-put.spec.js`:

```js
    it('returns 400 for missing required fields', async () => {
        const db = client.db('test-db');
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            token: 'validation-token',
            wishlists: [],
            wishItems: [],
        });

        const event = {
            httpMethod: 'PUT',
            path: '/api/user/validation-token/wishlist',
            body: JSON.stringify({wishlists: "not-an-array"}),
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBeDefined();
    });
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/netlify-functions/api-user-wishlist-put.spec.js`
Expected: New test FAILS

**Step 3: Add schema and validation**

In `netlify/functions/api-user-wishlist-put.mjs`:

```js
import {z} from "zod";
import {validateBody} from "../shared/middleware.mjs";
import {wishlistSchema, wishItemSchema} from "../shared/schemas/user.mjs";

const wishlistPutBody = z.object({
    wishlists: z.array(wishlistSchema),
    wishItems: z.array(wishItemSchema),
});
```

Update the handler — replace manual JSON.parse with validateBody, remove `|| []` from wasEmpty:

```js
export const handler = apiHandler("PUT", async (event) => {
    const token = extractTokenFromPath(event, "user");
    if (!token) return badRequest("Token required");

    const {data, error} = validateBody(wishlistPutBody, event);
    if (error) return badRequest(error);

    const user = await getUserByToken(token);
    if (!user) return unauthorized("User not found");

    const wasEmpty = user.wishlists.length === 0 && user.wishItems.length === 0;

    const usersCol = await getUsersCollection();
    await usersCol.updateOne(
        {token},
        {$set: {wishlists: data.wishlists, wishItems: data.wishItems}}
    );

    let notifiedGivers = false;
    if (wasEmpty && (data.wishlists.length > 0 || data.wishItems.length > 0)) {
        await forEachGiverOf(user, async ({giver, exchange}) => {
            const viewUrl = `${process.env.URL}/wishlist/view/${giver.token}?exchange=${exchange.exchangeId}`;
            await sendNotificationEmail(
                "wishlist-notification",
                giver.email,
                `${user.name} has added a wishlist!`,
                {
                    recipientName: user.name,
                    wishlistViewUrl: viewUrl,
                }
            );
        });
        notifiedGivers = true;
    }

    return ok({success: true, notifiedGivers});
});
```

**Step 4: Run all wishlist-put tests**

Run: `npx vitest run tests/netlify-functions/api-user-wishlist-put.spec.js`
Expected: All 6 tests pass (5 existing + 1 new)

**Step 5: Commit**

```
feat: add Zod request body validation to api-user-wishlist-put
```

---

### Task 8: Add Request Body Validation to api-user-contact-post

**Files:**
- Modify: `netlify/functions/api-user-contact-post.mjs`

**Step 1: Add schema with defaults**

In `netlify/functions/api-user-contact-post.mjs`:

```js
import {z} from "zod";
import {validateBody} from "../shared/middleware.mjs";

const contactPostBody = z.object({
    address: z.string().default("Not provided"),
    phone: z.string().default("Not provided"),
    notes: z.string().default("None"),
});
```

**Step 2: Replace manual JSON.parse and defaults**

Update handler to use validateBody, which applies schema defaults:

```js
export const handler = apiHandler("POST", async (event) => {
    const token = extractTokenFromPath(event, "user");
    if (!token) return badRequest("Token required");

    const {data, error} = validateBody(contactPostBody, event);
    if (error) return badRequest(error);

    const user = await getUserByToken(token);
    if (!user) return unauthorized("User not found");

    await forEachGiverOf(user, async ({giver}) => {
        await sendNotificationEmail(
            "contact-info",
            giver.email,
            `${user.name} has shared their contact information!`,
            {
                recipientName: user.name,
                address: data.address,
                phone: data.phone,
                notes: data.notes,
            }
        );
    });

    return ok({success: true});
});
```

The `|| "Not provided"` / `|| "None"` fallbacks are now handled by schema `.default()`.

**Step 3: Run tests**

Run: `npx vitest run tests/netlify-functions/api-user-contact-post.spec.js`
Expected: All 5 tests pass (existing "defaults missing contact fields" test validates schema defaults)

**Step 4: Commit**

```
feat: add Zod request body validation to api-user-contact-post
```

---

### Task 9: Refactor dispatchEmail with Full Treatment

This task rewrites `dispatchEmail.mjs` to use shared modules and Zod validation. The tests also need significant updates because the handler changes from using `node-fetch` (mocked via `vi.doMock`) to using `sendNotificationEmail` (which uses global `fetch`), and error responses change format.

**Files:**
- Rewrite: `netlify/functions/dispatchEmail.mjs`
- Rewrite: `tests/netlify-functions/dispatchEmail.spec.js`

**Step 1: Rewrite the handler**

Replace `netlify/functions/dispatchEmail.mjs` entirely:

```js
import {z} from "zod";
import {apiHandler} from "../shared/middleware.mjs";
import {validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";

const dispatchEmailBody = z.object({
    email: z.string(),
    name: z.string(),
    recipient: z.string(),
    wishlistEditUrl: z.string().nullable().default(null),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(dispatchEmailBody, event);
    if (error) return badRequest(error);

    await sendNotificationEmail(
        "secret-santa",
        data.email,
        "Your gift exchange recipient name has arrived!",
        {
            name: data.name,
            recipient: data.recipient,
            wishlistEditUrl: data.wishlistEditUrl,
        }
    );

    return ok({});
});
```

**Step 2: Rewrite the test file**

The tests need to change because:
- No more `node-fetch` mock — use `vi.stubGlobal('fetch', mockFetch)` instead
- No more `vi.doMock` / `vi.resetModules` dance
- 400 response for null body now returns `{error: "..."}` not `"Payload required"`
- 200 response now has `body: JSON.stringify({})` not no body
- 405 test should be added (apiHandler enforces method)

Replace `tests/netlify-functions/dispatchEmail.spec.js`:

```js
import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';

describe('dispatchEmail', () => {
    let handler;
    let mockFetch;
    let originalEnv;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeAll(async () => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        originalEnv = {...process.env};

        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret-key';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/dispatchEmail.mjs');
        handler = module.handler;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterAll(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        vi.unstubAllGlobals();
        process.env = originalEnv;
    });

    function buildEvent(body) {
        return {
            httpMethod: 'POST',
            body: JSON.stringify(body),
        };
    }

    it('returns 405 for non-POST requests', async () => {
        const event = {httpMethod: 'GET', body: '{}'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 for missing required fields', async () => {
        const event = {
            httpMethod: 'POST',
            body: JSON.stringify({email: 'test@test.com'}),
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toContain('Missing required field');
    });

    it('sends email with correct parameters', async () => {
        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
        });

        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[0]).toBe('https://test.netlify.app/.netlify/functions/emails/secret-santa');
    });

    it('includes correct email details in request body', async () => {
        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
        });

        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);

        expect(requestBody).toEqual({
            from: 'alex@soundrootsproductions.com',
            to: 'alex@test.com',
            subject: 'Your gift exchange recipient name has arrived!',
            parameters: {
                name: 'Alex',
                recipient: 'Whitney',
                wishlistEditUrl: null,
            },
        });
    });

    it('returns 500 when fetch fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
        });

        const response = await handler(event);
        expect(response.statusCode).toBe(500);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('Network error');
    });

    it('passes wishlistEditUrl when provided', async () => {
        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
            wishlistEditUrl: 'https://example.com/wishlist/edit/abc-123',
        });

        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody.parameters.wishlistEditUrl).toBe('https://example.com/wishlist/edit/abc-123');
    });

    it('defaults wishlistEditUrl to null when not provided', async () => {
        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
        });

        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody.parameters.wishlistEditUrl).toBeNull();
    });

    it('handles names with special characters', async () => {
        const event = buildEvent({
            name: "O'Brien",
            recipient: 'José García',
            email: 'obrien@test.com',
        });

        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody.parameters.name).toBe("O'Brien");
        expect(requestBody.parameters.recipient).toBe('José García');
    });
});
```

**Step 3: Run dispatchEmail tests**

Run: `npx vitest run tests/netlify-functions/dispatchEmail.spec.js`
Expected: All 8 tests pass

**Step 4: Run full test suite**

Run: `npx vitest run tests/netlify-functions/`
Expected: All tests pass

**Step 5: Commit**

```
feat: refactor dispatchEmail with apiHandler, Zod validation, and sendNotificationEmail
```

---

### Task 10: Final Verification

**Step 1: Run full test suite**

Run: `npx vitest run tests/netlify-functions/`
Expected: All tests pass

**Step 2: Verify no `|| []` fallbacks remain in api handlers**

Run: `grep -n "|| \[\]" netlify/functions/api-*.mjs`
Expected: No output (all removed)

**Step 3: Verify no `node-fetch` import remains**

Run: `grep -rn "node-fetch" netlify/functions/`
Expected: No output

**Step 4: Review final file structure**

```
netlify/shared/
  db.mjs                    (unchanged)
  responses.mjs             (ok() default param)
  middleware.mjs             (+ validateBody, formatZodError)
  auth.mjs                  (+ userSchema.parse in getUserByToken)
  giverNotification.mjs     (unchanged)
  schemas/
    user.mjs                (NEW)
    exchange.mjs            (NEW)
```
