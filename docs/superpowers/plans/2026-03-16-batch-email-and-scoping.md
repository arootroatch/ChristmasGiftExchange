# Batch Email API + Giver Scoping — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch bulk email sending to Postmark's batch API, rename the retry endpoint, and scope giver notifications to only the most recent exchange.

**Architecture:** Replace `sendEmailsWithRetry` with `sendBatchEmails` that posts to Postmark's `/email/batch` endpoint. Add `sendBatchNotificationEmails` as the new batch transport. Change `forEachGiverOf` to query only the latest exchange. Rename `api-giver-notify-post` → `api-giver-retry-post` everywhere.

**Tech Stack:** Postmark batch API, MongoDB sort queries, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-batch-email-and-scoping-design.md`

---

## Chunk 1: Core — sendBatchNotificationEmails + sendBatchEmails + forEachGiverOf scoping

### Task 1: Add `sendBatchNotificationEmails` with tests

**Files:**
- Modify: `netlify/shared/giverNotification.mjs`
- Modify: `spec/netlify-functions/giverNotification.spec.js`

- [ ] **Step 1: Write failing tests for `sendBatchNotificationEmails`**

Add a new `describe('sendBatchNotificationEmails', ...)` block in `spec/netlify-functions/giverNotification.spec.js` after the existing `sendNotificationEmail` describe block. The tests share the same `beforeAll` env setup pattern.

```js
describe('sendBatchNotificationEmails', () => {
    let sendBatchNotificationEmails;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        vi.stubGlobal('fetch', vi.fn());
        const module = await import('../../netlify/shared/giverNotification.mjs');
        sendBatchNotificationEmails = module.sendBatchNotificationEmails;
    });

    beforeEach(() => {
        fetch.mockReset();
    });

    afterAll(() => {
        vi.unstubAllGlobals();
        delete process.env.CONTEXT;
        delete process.env.POSTMARK_SERVER_TOKEN;
    });

    const messages = [
        {
            to: 'alex@test.com',
            templateName: 'secret-santa',
            subject: 'Your recipient!',
            parameters: {name: 'Alex', recipient: 'Whitney', wishlistEditUrl: null, wishlistViewUrl: null},
        },
        {
            to: 'whitney@test.com',
            templateName: 'secret-santa',
            subject: 'Your recipient!',
            parameters: {name: 'Whitney', recipient: 'Alex', wishlistEditUrl: null, wishlistViewUrl: null},
        },
    ];

    it('sends single POST to /email/batch with array of messages', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                {ErrorCode: 0, To: 'alex@test.com', MessageID: 'abc'},
                {ErrorCode: 0, To: 'whitney@test.com', MessageID: 'def'},
            ]),
        });

        const result = await sendBatchNotificationEmails(messages);

        expect(fetch).toHaveBeenCalledTimes(1);
        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe('https://api.postmarkapp.com/email/batch');
        expect(options.headers['X-Postmark-Server-Token']).toBe('test-postmark-token');

        const body = JSON.parse(options.body);
        expect(body).toHaveLength(2);
        expect(body[0].From).toBe('alex@soundrootsproductions.com');
        expect(body[0].To).toBe('alex@test.com');
        expect(body[0].HtmlBody).toContain('Alex');
        expect(body[1].To).toBe('whitney@test.com');
    });

    it('returns empty emailsFailed when all succeed', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                {ErrorCode: 0, To: 'alex@test.com'},
                {ErrorCode: 0, To: 'whitney@test.com'},
            ]),
        });

        const result = await sendBatchNotificationEmails(messages);
        expect(result.emailsFailed).toEqual([]);
    });

    it('returns failed emails when some have non-zero ErrorCode', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                {ErrorCode: 0, To: 'alex@test.com'},
                {ErrorCode: 406, To: 'whitney@test.com', Message: 'Inactive recipient'},
            ]),
        });

        const result = await sendBatchNotificationEmails(messages);
        expect(result.emailsFailed).toEqual(['whitney@test.com']);
    });

    it('throws when Postmark returns non-OK HTTP response', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Internal Server Error'),
        });

        await expect(sendBatchNotificationEmails(messages))
            .rejects.toThrow('Batch email send failed (500)');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/giverNotification.spec.js`
Expected: FAIL — `sendBatchNotificationEmails` is not exported

- [ ] **Step 3: Implement `sendBatchNotificationEmails`**

Add to `netlify/shared/giverNotification.mjs`, after the `sendNotificationEmail` function:

```js
export async function sendBatchNotificationEmails(messages) {
    if (process.env.CONTEXT === "dev") {
        messages.forEach(m => {
            console.log(`[DEV EMAIL] Template: ${m.templateName} | To: ${m.to} | Subject: ${m.subject}`);
            console.log("[DEV EMAIL] Parameters:", JSON.stringify(m.parameters, null, 2));
        });
        return {emailsFailed: []};
    }

    const postmarkMessages = await Promise.all(messages.map(async (m) => {
        const templateModule = await templateModules[m.templateName]();
        return {
            From: "alex@soundrootsproductions.com",
            To: m.to,
            Subject: m.subject,
            HtmlBody: templateModule.render(m.parameters),
        };
    }));

    const response = await fetch("https://api.postmarkapp.com/email/batch", {
        method: "POST",
        headers: {
            "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify(postmarkMessages),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Batch email send failed (${response.status}): ${body}`);
    }

    const results = await response.json();
    const emailsFailed = results
        .filter(r => r.ErrorCode !== 0)
        .map(r => r.To);

    return {emailsFailed};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/giverNotification.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/giverNotification.mjs spec/netlify-functions/giverNotification.spec.js
git commit -m "feat: add sendBatchNotificationEmails for Postmark batch API"
```

---

### Task 2: Replace `sendEmailsWithRetry` with `sendBatchEmails`

**Files:**
- Modify: `netlify/shared/giverNotification.mjs:24-63`
- Modify: `spec/netlify-functions/giverNotification.spec.js:1-93`

- [ ] **Step 1: Rewrite the `sendEmailsWithRetry` tests as `sendBatchEmails` tests**

Replace the entire `describe('sendEmailsWithRetry', ...)` block (lines 1-93) with:

```js
describe('sendBatchEmails', () => {
    let sendBatchEmails;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        vi.stubGlobal('fetch', vi.fn());
        const module = await import('../../netlify/shared/giverNotification.mjs');
        sendBatchEmails = module.sendBatchEmails;
    });

    beforeEach(() => {
        fetch.mockReset();
    });

    afterAll(() => {
        vi.unstubAllGlobals();
        delete process.env.CONTEXT;
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
    });

    const participants = [
        {name: 'Alex', email: 'alex@test.com'},
        {name: 'Whitney', email: 'whitney@test.com'},
    ];
    const assignments = [{giver: 'Alex', recipient: 'Whitney'}, {giver: 'Whitney', recipient: 'Alex'}];
    const userByEmail = {
        'alex@test.com': {token: 'alex-token'},
        'whitney@test.com': {token: 'whitney-token'},
    };

    function mockBatchSuccess(emails) {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(emails.map(e => ({ErrorCode: 0, To: e}))),
        });
    }

    it('sends single POST to /email/batch', async () => {
        mockBatchSuccess(['alex@test.com', 'whitney@test.com']);
        await sendBatchEmails(participants, assignments, userByEmail, 'exchange-123');

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0][0]).toBe('https://api.postmarkapp.com/email/batch');
    });

    it('returns empty emailsFailed when all succeed', async () => {
        mockBatchSuccess(['alex@test.com', 'whitney@test.com']);
        const result = await sendBatchEmails(participants, assignments, userByEmail, 'exchange-123');
        expect(result.emailsFailed).toEqual([]);
    });

    it('returns failed emails from Postmark per-message status', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                {ErrorCode: 0, To: 'alex@test.com'},
                {ErrorCode: 406, To: 'whitney@test.com', Message: 'Inactive'},
            ]),
        });

        const result = await sendBatchEmails(participants, assignments, userByEmail, 'exchange-123');
        expect(result.emailsFailed).toEqual(['whitney@test.com']);
    });

    it('sends correct email content with wishlist URLs', async () => {
        mockBatchSuccess(['alex@test.com', 'whitney@test.com']);
        await sendBatchEmails(participants, assignments, userByEmail, 'exchange-123');

        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body).toHaveLength(2);

        const alexMsg = body.find(m => m.To === 'alex@test.com');
        expect(alexMsg.HtmlBody).toContain('Alex');
        expect(alexMsg.HtmlBody).toContain('Whitney');
        expect(alexMsg.HtmlBody).toContain('https://test.netlify.app/wishlist/edit/alex-token');
        expect(alexMsg.HtmlBody).toContain('https://test.netlify.app/wishlist/view/alex-token?exchange=exchange-123');
    });

    it('omits wishlist CTA when user not in userByEmail', async () => {
        mockBatchSuccess(['alex@test.com', 'whitney@test.com']);
        await sendBatchEmails(participants, assignments, {}, 'exchange-123');

        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body[0].HtmlBody).not.toContain('Add Your Wishlist');
        expect(body[0].HtmlBody).not.toContain("Wish List");
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/giverNotification.spec.js`
Expected: FAIL — `sendBatchEmails` is not exported

- [ ] **Step 3: Replace `sendEmailsWithRetry` with `sendBatchEmails` in `giverNotification.mjs`**

Replace lines 24-63 of `netlify/shared/giverNotification.mjs` with:

```js
export async function sendBatchEmails(participants, assignments, userByEmail, exchangeId) {
    const messages = assignments.map(assignment => {
        const participant = participants.find(p => p.name === assignment.giver);
        const user = userByEmail[participant.email];
        const wishlistEditUrl = user ? absoluteUrl(wishlistEditPath(user.token)) : null;
        const wishlistViewUrl = user ? absoluteUrl(wishlistViewPath(user.token, exchangeId)) : null;

        return {
            to: participant.email,
            templateName: "secret-santa",
            subject: "Your gift exchange recipient name has arrived!",
            parameters: {
                name: assignment.giver,
                recipient: assignment.recipient,
                wishlistEditUrl,
                wishlistViewUrl,
            },
        };
    });

    return await sendBatchNotificationEmails(messages);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/giverNotification.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/giverNotification.mjs spec/netlify-functions/giverNotification.spec.js
git commit -m "feat: replace sendEmailsWithRetry with sendBatchEmails using Postmark batch API"
```

> **IMPORTANT:** After this commit, `api-giver-notify-post.mjs` and `api-exchange-post.mjs` import `sendEmailsWithRetry` which no longer exists. Do NOT run `npx vitest run` (full suite) until Task 4 is complete. Only run scoped tests: `npx vitest run spec/netlify-functions/giverNotification.spec.js`

---

### Task 3: Scope `forEachGiverOf` to most recent exchange + create tests

**Files:**
- Modify: `netlify/shared/giverNotification.mjs:4-22`
- Modify: `spec/netlify-functions/giverNotification.spec.js`

- [ ] **Step 1: Write failing tests for `forEachGiverOf`**

Add a new `describe('forEachGiverOf', ...)` block in `spec/netlify-functions/giverNotification.spec.js`. This needs MongoDB since it queries the DB.

First, add these imports to the existing import block at the top of the file:

```js
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';
import {ObjectId} from 'mongodb';
```

Then add the following describe block (at the top of the file, before the other describes, since it has its own beforeAll for mongo):

```js
describe('forEachGiverOf', () => {
    let forEachGiverOf, mongo, db;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/shared/giverNotification.mjs');
        forEachGiverOf = module.forEachGiverOf;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it('calls callback with giver from most recent exchange only', async () => {
        const recipientId = new ObjectId();
        const oldGiverId = new ObjectId();
        const newGiverId = new ObjectId();

        await db.collection('users').insertMany([
            {_id: recipientId, name: 'Bob', email: 'bob@test.com', token: 'bob-token', wishlists: [], wishItems: []},
            {_id: oldGiverId, name: 'OldAlice', email: 'old@test.com', token: 'old-token', wishlists: [], wishItems: []},
            {_id: newGiverId, name: 'NewAlice', email: 'new@test.com', token: 'new-token', wishlists: [], wishItems: []},
        ]);

        await db.collection('exchanges').insertMany([
            {
                exchangeId: 'old-exchange',
                createdAt: new Date('2025-01-01'),
                isSecretSanta: true,
                participants: [oldGiverId, recipientId],
                assignments: [{giverId: oldGiverId, recipientId}],
                houses: [],
            },
            {
                exchangeId: 'new-exchange',
                createdAt: new Date('2026-01-01'),
                isSecretSanta: true,
                participants: [newGiverId, recipientId],
                assignments: [{giverId: newGiverId, recipientId}],
                houses: [],
            },
        ]);

        const calls = [];
        await forEachGiverOf({_id: recipientId}, ({giver, exchange}) => {
            calls.push({giverName: giver.name, exchangeId: exchange.exchangeId});
        });

        expect(calls).toHaveLength(1);
        expect(calls[0].giverName).toBe('NewAlice');
        expect(calls[0].exchangeId).toBe('new-exchange');
    });

    it('does nothing when user has no exchanges', async () => {
        const recipientId = new ObjectId();
        const calls = [];
        await forEachGiverOf({_id: recipientId}, ({giver}) => {
            calls.push(giver);
        });
        expect(calls).toHaveLength(0);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/giverNotification.spec.js`
Expected: FAIL — first test fails because `forEachGiverOf` calls callback for BOTH exchanges

- [ ] **Step 3: Update `forEachGiverOf` to query only most recent exchange**

Replace lines 4-22 of `netlify/shared/giverNotification.mjs` with:

```js
export async function forEachGiverOf(recipientUser, callback) {
    const exchangesCol = await getExchangesCollection();
    const usersCol = await getUsersCollection();

    const exchange = await exchangesCol.findOne(
        {"assignments.recipientId": recipientUser._id},
        {sort: {createdAt: -1}}
    );

    if (!exchange) return;

    for (const assignment of exchange.assignments) {
        if (assignment.recipientId.equals(recipientUser._id)) {
            const giver = await usersCol.findOne({_id: assignment.giverId});
            if (giver) {
                await callback({giver, exchange});
            }
        }
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/giverNotification.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/giverNotification.mjs spec/netlify-functions/giverNotification.spec.js
git commit -m "feat: scope forEachGiverOf to most recent exchange only"
```

---

## Chunk 2: Rename endpoint + update all callers and tests

### Task 4: Rename `api-giver-notify-post` → `api-giver-retry-post`

**Files:**
- Rename: `netlify/functions/api-giver-notify-post.mjs` → `netlify/functions/api-giver-retry-post.mjs`
- Rename: `spec/netlify-functions/api-giver-notify-post.spec.js` → `spec/netlify-functions/api-giver-retry-post.spec.js`
- Rename: `spec/integration/api-giver-notify-post.contract.spec.js` → `spec/integration/api-giver-retry-post.contract.spec.js`
- Modify: `src/exchange/components/EmailTable/EmailTable.js:190`
- Modify: `src/exchange/components/EmailTable/FailedEmails.js:72`
- Modify: `spec/exchange/components/EmailTable/EmailTable.spec.js:514,522`

- [ ] **Step 1: Rename the three files**

```bash
git mv netlify/functions/api-giver-notify-post.mjs netlify/functions/api-giver-retry-post.mjs
git mv spec/netlify-functions/api-giver-notify-post.spec.js spec/netlify-functions/api-giver-retry-post.spec.js
git mv spec/integration/api-giver-notify-post.contract.spec.js spec/integration/api-giver-retry-post.contract.spec.js
```

- [ ] **Step 2: Update the endpoint URL in frontend source files**

In `src/exchange/components/EmailTable/EmailTable.js` line 190:
```
api-giver-notify-post → api-giver-retry-post
```

In `src/exchange/components/EmailTable/FailedEmails.js` line 72:
```
api-giver-notify-post → api-giver-retry-post
```

- [ ] **Step 3: Update the error-alert endpoint string inside the handler**

In `netlify/functions/api-giver-retry-post.mjs` line 41:
```
endpoint: "api-giver-notify-post" → endpoint: "api-giver-retry-post"
```

- [ ] **Step 4: Update the import inside the handler to use `sendBatchEmails`**

In `netlify/functions/api-giver-retry-post.mjs` line 4:
```js
// Old:
import {sendNotificationEmail, sendEmailsWithRetry} from "../shared/giverNotification.mjs";

// New:
import {sendNotificationEmail, sendBatchEmails} from "../shared/giverNotification.mjs";
```

And line 30:
```js
// Old:
const {emailsFailed} = await sendEmailsWithRetry(data.participants, data.assignments, userByEmail, data.exchangeId);

// New:
const {emailsFailed} = await sendBatchEmails(data.participants, data.assignments, userByEmail, data.exchangeId);
```

- [ ] **Step 5: Update `api-exchange-post.mjs` import**

In `netlify/functions/api-exchange-post.mjs` line 4:
```js
// Old:
import {sendEmailsWithRetry} from "../shared/giverNotification.mjs";

// New:
import {sendBatchEmails} from "../shared/giverNotification.mjs";
```

And line 131:
```js
// Old:
const {emailsFailed} = await sendEmailsWithRetry(data.participants, data.assignments, userByEmail, data.exchangeId);

// New:
const {emailsFailed} = await sendBatchEmails(data.participants, data.assignments, userByEmail, data.exchangeId);
```

- [ ] **Step 6: Commit the renames and source changes**

```bash
git add -A
git commit -m "refactor: rename api-giver-notify-post to api-giver-retry-post and switch to sendBatchEmails"
```

---

### Task 5: Update `api-giver-retry-post.spec.js` for batch behavior

**Files:**
- Modify: `spec/netlify-functions/api-giver-retry-post.spec.js`

- [ ] **Step 1: Update describe block, import, and endpoint reference**

Change describe (line 5): `'api-giver-notify-post'` → `'api-giver-retry-post'`

Change import (line 25): `api-giver-notify-post.mjs` → `api-giver-retry-post.mjs`

- [ ] **Step 2: Update mock to return batch-format responses**

The `mockFetch` default in `beforeAll` (line 22) currently returns `{ok: true}`. For batch, it needs to return batch results. Change to:

```js
mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([]),
});
```

But individual tests will need to set up specific batch responses. Add a helper after `buildEvent`:

```js
function mockBatchResponse(emails, failedEmails = []) {
    mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(
            emails.map(e => ({
                ErrorCode: failedEmails.includes(e) ? 406 : 0,
                To: e,
            }))
        ),
    });
}
```

- [ ] **Step 3: Rewrite tests for batch behavior**

The `'sends one email per assignment with correct parameters'` test (line 93): Now it's a single batch call, not 3 calls. Update:

```js
it('sends batch email with correct parameters', async () => {
    mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);
    const event = buildEvent(bulkPayload);
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.postmarkapp.com/email/batch');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toHaveLength(3);
    const alexMsg = body.find(m => m.To === 'alex@test.com');
    expect(alexMsg.HtmlBody).toContain('Whitney');
});
```

The `'builds wishlistEditUrl from DB token'` test (line 110): Update to read from batch array:

```js
it('builds wishlistEditUrl from DB token and process.env.URL', async () => {
    mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);
    const event = buildEvent(bulkPayload);
    await handler(event);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const tokenMap = {Alex: alexToken, Whitney: whitneyToken, Hunter: hunterToken};

    body.forEach(msg => {
        const matchedName = Object.keys(tokenMap).find(name =>
            msg.HtmlBody.includes(`Greetings, ${name}`)
        );
        expect(msg.HtmlBody).toContain(
            `https://test.netlify.app/wishlist/edit/${tokenMap[matchedName]}`
        );
    });
});
```

The `'returns sent and total counts'` test (line 128): Update mock:

```js
it('returns sent and total counts', async () => {
    mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);
    const event = buildEvent(bulkPayload);
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(body.sent).toBe(3);
    expect(body.total).toBe(3);
});
```

The `'counts partial failures'` test (line 137): Replace retry-based mock with batch failure:

```js
it('counts partial failures', async () => {
    mockBatchResponse(
        ['alex@test.com', 'whitney@test.com', 'hunter@test.com'],
        ['whitney@test.com']
    );
    // error-alert email for the failure
    mockFetch.mockResolvedValueOnce({ok: true});

    const event = buildEvent(bulkPayload);
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(body.sent).toBe(2);
    expect(body.total).toBe(3);
    expect(body.emailsFailed).toEqual(['whitney@test.com']);
});
```

The `'returns emailsFailed array'` test (line 155): Similar update:

```js
it('returns emailsFailed array with failed emails', async () => {
    mockBatchResponse(
        ['alex@test.com', 'whitney@test.com', 'hunter@test.com'],
        ['alex@test.com']
    );
    mockFetch.mockResolvedValueOnce({ok: true}); // error-alert

    const event = buildEvent(bulkPayload);
    const response = await handler(event);
    const body = JSON.parse(response.body);

    expect(body.emailsFailed).toContain('alex@test.com');
    expect(body.emailsFailed).toHaveLength(1);
});
```

The `'sends error-alert email to admin'` test (line 172): Update to use batch failure mock and check error-alert is a separate single-email call:

```js
it('sends error-alert email to admin when emails fail', async () => {
    mockBatchResponse(
        ['alex@test.com', 'whitney@test.com', 'hunter@test.com'],
        ['alex@test.com']
    );
    mockFetch.mockResolvedValueOnce({ok: true}); // error-alert

    const event = buildEvent(bulkPayload);
    await handler(event);

    // Second call should be the error-alert (single email, not batch)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const errorAlertBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(errorAlertBody.HtmlBody).toContain('api-giver-retry-post');
    expect(errorAlertBody.HtmlBody).toContain('alex@test.com');
});
```

The `'counts emails that return non-OK response'` test (line 195): Remove this test — non-OK HTTP response means the whole batch failed, not individual emails. The batch-level error is handled by `sendBatchNotificationEmails` throwing.

The `'omits wishlist CTA when user not found in DB'` test (line 213): Update mock:

```js
it('omits wishlist CTA when user not found in DB', async () => {
    await db.collection('users').deleteOne({email: 'alex@test.com'});
    mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);

    const event = buildEvent(bulkPayload);
    await handler(event);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const alexMsg = body.find(m => m.To === 'alex@test.com');
    expect(alexMsg.HtmlBody).not.toContain('Add Your Wishlist');
});
```

The `'handles names with special characters'` test (line 225): Update mock:

```js
it('handles names with special characters', async () => {
    await db.collection('users').insertOne({
        name: "O'Brien", email: 'obrien@test.com', token: crypto.randomUUID(), wishlists: [], wishItems: [],
    });
    mockBatchResponse(["obrien@test.com"]);

    const event = buildEvent({
        exchangeId: 'test-exchange-id',
        participants: [{name: "O'Brien", email: 'obrien@test.com'}],
        assignments: [{giver: "O'Brien", recipient: 'Whitney'}],
    });

    await handler(event);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body[0].HtmlBody).toContain('O&#39;Brien');
});
```

- [ ] **Step 4: Update the EmailTable.spec.js assertion**

In `spec/exchange/components/EmailTable/EmailTable.spec.js`:

Line 514: `"submits to api-giver-notify-post on submit"` → `"submits to api-giver-retry-post on submit"`

Line 522: `"/.netlify/functions/api-giver-notify-post"` → `"/.netlify/functions/api-giver-retry-post"`

- [ ] **Step 5: Run all affected tests**

```bash
npx vitest run spec/netlify-functions/api-giver-retry-post.spec.js spec/exchange/components/EmailTable/EmailTable.spec.js
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: update api-giver-retry-post and EmailTable tests for batch API"
```

---

### Task 6: Update `api-exchange-post.spec.js` and contract test

**Files:**
- Modify: `spec/netlify-functions/api-exchange-post.spec.js`
- Modify: `spec/integration/api-giver-retry-post.contract.spec.js`

- [ ] **Step 1: Update `api-exchange-post.spec.js` mock**

The test stubs `fetch` globally. After the batch change, the exchange-post handler calls `sendBatchEmails` which calls `sendBatchNotificationEmails` which makes a single POST to `/email/batch`. The current default mock `vi.fn().mockResolvedValue({ok: true})` won't work because `sendBatchNotificationEmails` calls `response.json()`.

Update the `mockFetch` in `beforeAll` to return a batch-compatible response:

```js
mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([]),
});
```

Scan the file for any assertions on `mockFetch` call counts or body shapes and update them for single-batch-call behavior.

- [ ] **Step 2: Update the contract test**

In `spec/integration/api-giver-retry-post.contract.spec.js`:

Change describe (line 4): `'api-giver-notify-post contract'` → `'api-giver-retry-post contract'`

Change import (line 12): `api-giver-notify-post.mjs` → `api-giver-retry-post.mjs`

Update the `fetch` mock in `beforeAll` (line 8) to return batch-compatible response:

```js
vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
})));
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run spec/netlify-functions/api-exchange-post.spec.js spec/integration/api-giver-retry-post.contract.spec.js
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add spec/netlify-functions/api-exchange-post.spec.js spec/integration/api-giver-retry-post.contract.spec.js
git commit -m "test: update api-exchange-post and contract tests for batch API"
```

---

### Task 7: Update `.claude/CLAUDE.md` references

**Files:**
- Modify: `.claude/CLAUDE.md`

- [ ] **Step 1: Replace all `api-giver-notify-post` references**

There are 4 references in `.claude/CLAUDE.md`:
- Line 75: endpoint description
- Line 151: file structure listing
- Line 195: test file listing
- Line 213: contract test listing

Replace all occurrences of `api-giver-notify-post` with `api-giver-retry-post`. Also update the description on line 75 from "Sends recipient assignment notification email to a giver" to "Retries failed email sends for an exchange".

Also replace `sendEmailsWithRetry` with `sendBatchEmails` if referenced.

- [ ] **Step 2: Commit**

```bash
git add .claude/CLAUDE.md
git commit -m "docs: update CLAUDE.md for api-giver-retry-post rename and sendBatchEmails"
```

---

### Task 8: Add `forEachGiverOf` scoping tests to caller specs

**Files:**
- Modify: `spec/netlify-functions/api-user-wishlist-put.spec.js`
- Modify: `spec/netlify-functions/api-user-contact-post.spec.js`

Both callers use `forEachGiverOf` to notify givers. Add a test to each verifying only the most recent exchange's giver is notified.

- [ ] **Step 1: Add scoping test to `api-user-wishlist-put.spec.js`**

Add this test after the existing `'does not notify givers on subsequent wishlist updates'` test:

```js
it('notifies only the giver from the most recent exchange', async () => {
    const recipientId = new ObjectId();
    const oldGiverId = new ObjectId();
    const newGiverId = new ObjectId();
    const recipientToken = crypto.randomUUID();

    await db.collection('users').insertMany([
        {_id: recipientId, email: 'recipient@test.com', name: 'Whitney', token: recipientToken, wishlists: [], wishItems: []},
        {_id: oldGiverId, email: 'old-giver@test.com', name: 'OldAlex', token: crypto.randomUUID(), wishlists: [], wishItems: []},
        {_id: newGiverId, email: 'new-giver@test.com', name: 'NewAlex', token: crypto.randomUUID(), wishlists: [], wishItems: []},
    ]);

    await db.collection('exchanges').insertMany([
        {
            exchangeId: 'old-exchange', createdAt: new Date('2025-01-01'), isSecretSanta: true,
            participants: [oldGiverId, recipientId],
            assignments: [{giverId: oldGiverId, recipientId}], houses: [],
        },
        {
            exchangeId: 'new-exchange', createdAt: new Date('2026-01-01'), isSecretSanta: true,
            participants: [newGiverId, recipientId],
            assignments: [{giverId: newGiverId, recipientId}], houses: [],
        },
    ]);

    const event = buildEvent(recipientToken, {
        wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
        wishItems: [],
    });

    await handler(event);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const emailBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(emailBody.To).toBe('new-giver@test.com');
});
```

- [ ] **Step 2: Add scoping test to `api-user-contact-post.spec.js`**

Add this test after the existing `'defaults missing contact fields to fallback text'` test:

```js
it('sends contact info only to the giver from the most recent exchange', async () => {
    const recipientId = new ObjectId();
    const oldGiverId = new ObjectId();
    const newGiverId = new ObjectId();
    const recipientToken = crypto.randomUUID();

    await db.collection('users').insertMany([
        {_id: recipientId, email: 'recipient@test.com', name: 'Whitney', token: recipientToken, wishlists: [], wishItems: []},
        {_id: oldGiverId, email: 'old-giver@test.com', name: 'OldAlex', token: crypto.randomUUID(), wishlists: [], wishItems: []},
        {_id: newGiverId, email: 'new-giver@test.com', name: 'NewAlex', token: crypto.randomUUID(), wishlists: [], wishItems: []},
    ]);

    await db.collection('exchanges').insertMany([
        {
            exchangeId: 'old-exchange', createdAt: new Date('2025-01-01'), isSecretSanta: true,
            participants: [oldGiverId, recipientId],
            assignments: [{giverId: oldGiverId, recipientId}], houses: [],
        },
        {
            exchangeId: 'new-exchange', createdAt: new Date('2026-01-01'), isSecretSanta: true,
            participants: [newGiverId, recipientId],
            assignments: [{giverId: newGiverId, recipientId}], houses: [],
        },
    ]);

    const event = buildEvent(recipientToken, {
        address: '123 Main St', phone: '555-1234', notes: 'Front door',
    });

    await handler(event);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const emailBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(emailBody.To).toBe('new-giver@test.com');
});
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run spec/netlify-functions/api-user-wishlist-put.spec.js spec/netlify-functions/api-user-contact-post.spec.js
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add spec/netlify-functions/api-user-wishlist-put.spec.js spec/netlify-functions/api-user-contact-post.spec.js
git commit -m "test: verify forEachGiverOf scoping in wishlist-put and contact-post callers"
```

---

## Chunk 3: Verification

### Task 9: Full test suite + grep verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Verify no old references remain**

```bash
grep -r "sendEmailsWithRetry" netlify/ spec/ src/ --include="*.mjs" --include="*.js"
grep -r "api-giver-notify-post" netlify/ spec/ src/ --include="*.mjs" --include="*.js"
```

Both should return zero matches.

- [ ] **Step 3: Run e2e tests**

```bash
npx playwright test --config e2e/playwright.config.js
```

Expected: ALL PASS (12 tests)
