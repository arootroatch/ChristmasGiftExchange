# Email Multimethod Dispatch Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inline environment checks in email sending with Clojure-style multimethod dispatch, enabling simulated email failures in dev via `@fail.test` addresses.

**Architecture:** A generic `defmulti`/`defmethod` module dispatches `sendNotificationEmail` and `sendBatchNotificationEmails` based on `process.env.CONTEXT`. Dev and Postmark providers register implementations separately. The Vite plugin strips the Verifalia widget in dev mode so `@fail.test` addresses aren't blocked.

**Tech Stack:** Vanilla JS (ESM), Vitest, Vite plugin API, Netlify serverless functions

**Spec:** `docs/superpowers/specs/2026-03-17-email-multimethod-design.md`

---

### Task 1: Multimethod Module

**Files:**
- Create: `netlify/shared/multimethod.mjs`
- Create: `spec/netlify-functions/multimethod.spec.js`

- [ ] **Step 1: Write failing tests for defmulti**

Create `spec/netlify-functions/multimethod.spec.js`:

```js
import {describe, expect, it} from 'vitest';
import {defmulti} from '../../netlify/shared/multimethod.mjs';

describe('defmulti', () => {
    it('dispatches to registered method based on dispatch function', () => {
        const greet = defmulti((lang) => lang);
        greet.defmethod('en', (lang) => 'hello');
        greet.defmethod('es', (lang) => 'hola');

        expect(greet('en')).toBe('hello');
        expect(greet('es')).toBe('hola');
    });

    it('throws when no method registered for dispatch value', () => {
        const greet = defmulti((lang) => lang);

        expect(() => greet('fr')).toThrow('No method for dispatch value: fr');
    });

    it('supports dispatch functions that derive from arguments', () => {
        const area = defmulti((shape) => shape.type);
        area.defmethod('circle', (shape) => Math.PI * shape.r ** 2);
        area.defmethod('rect', (shape) => shape.w * shape.h);

        expect(area({type: 'circle', r: 1})).toBeCloseTo(Math.PI);
        expect(area({type: 'rect', w: 3, h: 4})).toBe(12);
    });

    it('keeps separate registries for independent multimethods', () => {
        const dispatch = (x) => x;
        const a = defmulti(dispatch);
        const b = defmulti(dispatch);
        a.defmethod('x', () => 'from-a');
        b.defmethod('x', () => 'from-b');

        expect(a('x')).toBe('from-a');
        expect(b('x')).toBe('from-b');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/multimethod.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement defmulti**

Create `netlify/shared/multimethod.mjs`:

```js
export function defmulti(dispatchFn) {
    const methods = {};

    function multi(...args) {
        const key = dispatchFn(...args);
        const method = methods[key];
        if (!method) throw new Error(`No method for dispatch value: ${key}`);
        return method(...args);
    }

    multi.defmethod = (dispatchValue, fn) => {
        methods[dispatchValue] = fn;
    };

    return multi;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/multimethod.spec.js`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```
feat: add lightweight multimethod dispatch module
```

---

### Task 2: Dev Email Provider

**Files:**
- Create: `netlify/shared/emailProviders/dev.mjs`
- Create: `spec/netlify-functions/emailProviders/dev.spec.js`

**Context:** This provider registers `"dev"` implementations. Emails to `@fail.test` simulate failure. Tests import the multimethod from a local test setup (not from `giverNotification.mjs`) to avoid the circular dependency during testing.

- [ ] **Step 1: Write failing tests**

Create `spec/netlify-functions/emailProviders/dev.spec.js`:

```js
import {describe, expect, it, vi, beforeAll, beforeEach} from 'vitest';
import {defmulti} from '../../../netlify/shared/multimethod.mjs';

describe('dev email provider', () => {
    let sendNotificationEmail, sendBatchNotificationEmails;

    beforeAll(async () => {
        sendNotificationEmail = defmulti(() => 'dev');
        sendBatchNotificationEmails = defmulti(() => 'dev');

        // Mock the giverNotification imports so dev.mjs can register on our test multimethods
        vi.doMock('../../../netlify/shared/giverNotification.mjs', () => ({
            sendNotificationEmail,
            sendBatchNotificationEmails,
        }));

        await import('../../../netlify/shared/emailProviders/dev.mjs');
    });

    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    describe('sendBatchNotificationEmails', () => {
        it('logs each message', async () => {
            const messages = [{
                to: 'alex@test.com',
                templateName: 'secret-santa',
                subject: 'Your recipient!',
                parameters: {name: 'Alex'},
            }];

            await sendBatchNotificationEmails(messages);

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[DEV EMAIL] Template: secret-santa')
            );
        });

        it('returns empty emailsFailed for non-fail.test addresses', async () => {
            const messages = [{
                to: 'alex@test.com', templateName: 'secret-santa',
                subject: 'Test', parameters: {},
            }];

            const result = await sendBatchNotificationEmails(messages);

            expect(result.emailsFailed).toEqual([]);
        });

        it('returns @fail.test addresses in emailsFailed', async () => {
            const messages = [
                {to: 'alex@fail.test', templateName: 'secret-santa', subject: 'Test', parameters: {}},
                {to: 'whitney@test.com', templateName: 'secret-santa', subject: 'Test', parameters: {}},
                {to: 'hunter@fail.test', templateName: 'secret-santa', subject: 'Test', parameters: {}},
            ];

            const result = await sendBatchNotificationEmails(messages);

            expect(result.emailsFailed).toEqual(['alex@fail.test', 'hunter@fail.test']);
        });
    });

    describe('sendNotificationEmail', () => {
        it('logs template, recipient, subject, and parameters', async () => {
            await sendNotificationEmail('wishlist-link', 'alex@test.com', 'Subject', {url: 'http://test'});

            expect(console.log).toHaveBeenCalledWith(
                expect.stringContaining('[DEV EMAIL] Template: wishlist-link | To: alex@test.com')
            );
        });

        it('succeeds for non-fail.test addresses', async () => {
            await expect(
                sendNotificationEmail('secret-santa', 'alex@test.com', 'Subject', {})
            ).resolves.toBeUndefined();
        });

        it('throws for @fail.test addresses', async () => {
            await expect(
                sendNotificationEmail('secret-santa', 'alex@fail.test', 'Subject', {})
            ).rejects.toThrow('Simulated email failure');
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/emailProviders/dev.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement dev provider**

Create `netlify/shared/emailProviders/dev.mjs`:

```js
import {sendNotificationEmail, sendBatchNotificationEmails} from "../giverNotification.mjs";

sendBatchNotificationEmails.defmethod("dev", async (messages) => {
    const emailsFailed = [];
    for (const m of messages) {
        console.log(`[DEV EMAIL] Template: ${m.templateName} | To: ${m.to} | Subject: ${m.subject}`);
        console.log("[DEV EMAIL] Parameters:", JSON.stringify(m.parameters, null, 2));
        if (m.to.endsWith("@fail.test")) emailsFailed.push(m.to);
    }
    return {emailsFailed};
});

sendNotificationEmail.defmethod("dev", async (templateName, to, subject, parameters) => {
    console.log(`[DEV EMAIL] Template: ${templateName} | To: ${to} | Subject: ${subject}`);
    console.log("[DEV EMAIL] Parameters:", JSON.stringify(parameters, null, 2));
    if (to.endsWith("@fail.test")) {
        throw new Error(`[DEV] Simulated email failure for ${to}`);
    }
});
```

**Note:** This file imports multimethods from `giverNotification.mjs`, creating a circular dependency. This is safe because ESM evaluates `export const sendNotificationEmail = defmulti(byContext)` synchronously before resolving provider imports. However, `giverNotification.mjs` doesn't exist in its new form yet — it will be created in Task 4. For now, the tests use `vi.doMock` to provide the multimethods directly.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/emailProviders/dev.spec.js`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```
feat: add dev email provider with @fail.test simulation
```

---

### Task 3: Postmark Email Provider

**Files:**
- Create: `netlify/shared/emailProviders/postmark.mjs`
- Create: `spec/netlify-functions/emailProviders/postmark.spec.js`

**Context:** Extract the current Postmark code from `giverNotification.mjs` lines 54-139 into a standalone provider. The template registry (`templateModules`) moves here. Tests are relocated from the `sendNotificationEmail` and `sendBatchNotificationEmails` describe blocks in `giverNotification.spec.js`.

- [ ] **Step 1: Write failing tests**

Create `spec/netlify-functions/emailProviders/postmark.spec.js`. These are the existing tests from `giverNotification.spec.js` lines 164-318, adapted to import from the new provider:

```js
import {describe, expect, it, vi, beforeAll, beforeEach, afterAll} from 'vitest';
import {defmulti} from '../../../netlify/shared/multimethod.mjs';

describe('postmark email provider', () => {
    let sendNotificationEmail, sendBatchNotificationEmails;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        vi.stubGlobal('fetch', vi.fn());

        sendNotificationEmail = defmulti(() => 'production');
        sendBatchNotificationEmails = defmulti(() => 'production');

        vi.doMock('../../../netlify/shared/giverNotification.mjs', () => ({
            sendNotificationEmail,
            sendBatchNotificationEmails,
        }));

        await import('../../../netlify/shared/emailProviders/postmark.mjs');
    });

    afterAll(() => {
        vi.unstubAllGlobals();
        delete process.env.CONTEXT;
        delete process.env.POSTMARK_SERVER_TOKEN;
    });

    describe('sendNotificationEmail', () => {
        beforeEach(() => {
            fetch.mockReset();
            fetch.mockResolvedValue({ok: true});
        });

        it('sends to Postmark API with correct headers and body', async () => {
            await sendNotificationEmail('secret-santa', 'user@test.com', 'Subject', {
                name: 'Alex', recipient: 'Whitney', wishlistEditUrl: null, wishlistViewUrl: null,
            });

            expect(fetch).toHaveBeenCalledTimes(1);
            const [url, options] = fetch.mock.calls[0];
            expect(url).toBe('https://api.postmarkapp.com/email');
            expect(options.headers['X-Postmark-Server-Token']).toBe('test-postmark-token');
            expect(options.headers['Content-Type']).toBe('application/json');

            const body = JSON.parse(options.body);
            expect(body.From).toBe('alex@soundrootsproductions.com');
            expect(body.To).toBe('user@test.com');
            expect(body.Subject).toBe('Subject');
            expect(body.HtmlBody).toContain('Alex');
            expect(body.HtmlBody).toContain('Whitney');
        });

        it('throws with Postmark response body on failure', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 422,
                text: () => Promise.resolve('{"ErrorCode":300,"Message":"Invalid email"}'),
            });

            await expect(
                sendNotificationEmail('secret-santa', 'bad@test.com', 'Subject', {
                    name: 'A', recipient: 'B', wishlistEditUrl: null, wishlistViewUrl: null,
                })
            ).rejects.toThrow('Email send failed (422)');
        });

        it('throws for unknown template name', async () => {
            await expect(
                sendNotificationEmail('nonexistent', 'a@b.com', 'Subject', {})
            ).rejects.toThrow('Unknown email template: nonexistent');
        });
    });

    describe('sendBatchNotificationEmails', () => {
        beforeEach(() => {
            fetch.mockReset();
        });

        const messages = [
            {
                to: 'alex@test.com', templateName: 'secret-santa',
                subject: 'Your recipient!',
                parameters: {name: 'Alex', recipient: 'Whitney', wishlistEditUrl: null, wishlistViewUrl: null},
            },
            {
                to: 'whitney@test.com', templateName: 'secret-santa',
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/emailProviders/postmark.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement postmark provider**

Create `netlify/shared/emailProviders/postmark.mjs`:

```js
import {sendNotificationEmail, sendBatchNotificationEmails} from "../giverNotification.mjs";

const templateModules = {
    "secret-santa": () => import("../emails/secretSanta.mjs"),
    "results-summary": () => import("../emails/resultsSummary.mjs"),
    "wishlist-notification": () => import("../emails/wishlistNotification.mjs"),
    "contact-info": () => import("../emails/contactInfo.mjs"),
    "error-alert": () => import("../emails/errorAlert.mjs"),
    "wishlist-link": () => import("../emails/wishlistLink.mjs"),
};

sendNotificationEmail.defmethod("production", async (templateName, to, subject, parameters) => {
    const loadModule = templateModules[templateName];
    if (!loadModule) {
        throw new Error(`Unknown email template: ${templateName}`);
    }

    const templateModule = await loadModule();
    const htmlBody = templateModule.render(parameters);

    const response = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
            "X-Postmark-Server-Token": process.env.POSTMARK_SERVER_TOKEN,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        body: JSON.stringify({
            From: "alex@soundrootsproductions.com",
            To: to,
            Subject: subject,
            HtmlBody: htmlBody,
        }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Email send failed (${response.status}): ${templateName} to ${to} — ${body}`);
    }
});

sendBatchNotificationEmails.defmethod("production", async (messages) => {
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
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/emailProviders/postmark.spec.js`
Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```
feat: add Postmark email provider extracted from giverNotification
```

---

### Task 4: Refactor giverNotification.mjs to Use Multimethods

**Files:**
- Modify: `netlify/shared/giverNotification.mjs`
- Modify: `spec/netlify-functions/giverNotification.spec.js`

**Context:** Replace inline `if (process.env.CONTEXT === "dev")` logic with multimethod definitions. Remove the `sendNotificationEmail` and `sendBatchNotificationEmails` implementations (now in providers). Keep `sendBatchEmails`, `forEachGiverOf`, `setRequestOrigin`. Import both providers so they register on module load.

The `sendBatchEmails` tests move to `postmark.spec.js` since they exercise the full Postmark stack (they set `CONTEXT=production` and mock `fetch`). Only `forEachGiverOf` tests remain in `giverNotification.spec.js`.

- [ ] **Step 1: Rewrite giverNotification.mjs**

Replace the full contents of `netlify/shared/giverNotification.mjs` with:

```js
import {getUsersCollection, getExchangesCollection} from "./db.mjs";
import {wishlistEditPath, wishlistViewPath, absoluteUrl} from "./links.mjs";
import {defmulti} from "./multimethod.mjs";

const byContext = () => process.env.CONTEXT === "dev" ? "dev" : "production";

export const sendNotificationEmail = defmulti(byContext);
export const sendBatchNotificationEmails = defmulti(byContext);

import "./emailProviders/dev.mjs";
import "./emailProviders/postmark.mjs";

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

let _requestOrigin = null;

export function setRequestOrigin(event) {
    _requestOrigin = event?.rawUrl ? new URL(event.rawUrl).origin : null;
}
```

- [ ] **Step 2: Move sendBatchEmails tests to postmark.spec.js**

Add the `sendBatchEmails` describe block from `giverNotification.spec.js` (lines 73-162) to the end of `spec/netlify-functions/emailProviders/postmark.spec.js`. Update the import to get `sendBatchEmails` from `giverNotification.mjs`:

```js
describe('sendBatchEmails', () => {
    let sendBatchEmails;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        vi.stubGlobal('fetch', vi.fn());
        vi.resetModules();
        const module = await import('../../../netlify/shared/giverNotification.mjs');
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
        expect(alexMsg.HtmlBody).toContain('https://test.netlify.app/wishlist/edit?user=alex-token');
        expect(alexMsg.HtmlBody).toContain('https://test.netlify.app/wishlist/view?user=alex-token&amp;exchange=exchange-123');
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

**Note:** The `sendBatchEmails` describe block needs its own `beforeAll` that does a real import (not mocked) of `giverNotification.mjs` since it tests the orchestration layer. Use `vi.resetModules()` to clear the module cache from the provider tests above, then dynamically import the fresh module.

- [ ] **Step 3: Update giverNotification.spec.js — keep only forEachGiverOf**

Replace `spec/netlify-functions/giverNotification.spec.js` with only the `forEachGiverOf` describe block (lines 1-71 of the original). Remove the `sendBatchEmails`, `sendNotificationEmail`, and `sendBatchNotificationEmails` describe blocks.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run spec/netlify-functions/`
Expected: All tests pass. The `sendBatchEmails`, `sendNotificationEmail`, and `sendBatchNotificationEmails` tests now live in `spec/netlify-functions/emailProviders/postmark.spec.js`.

- [ ] **Step 5: Commit**

```
refactor: replace inline env checks with multimethod dispatch in giverNotification
```

---

### Task 5: Strip Verifalia in Dev Mode

**Files:**
- Modify: `src/vitePageRoutes.js`
- Modify: `spec/vitePageRoutes.spec.js`

**Context:** Add a `transformIndexHtml` hook to the existing Vite plugin that strips the Verifalia widget script and attribution div during `vite serve` only. The Verifalia markup in `index.html` is:
```html
<div style="display: none">Powered by Verifalia <a href="https://verifalia.com/">email verifier</a></div>
<script defer
        src="https://unpkg.com/verifalia-widget@1.10.0/dist/verifalia-widget.js"
        data-verifalia-appkey="c7211d6169e942ba92ae6b850bfe0309"
        integrity="sha512-..."
        crossorigin="anonymous"></script>
```

The script tag spans multiple lines, so the regex must use `[\s\S]*?` for the tag body.

- [ ] **Step 1: Write failing tests**

Add to `spec/vitePageRoutes.spec.js`, inside the main `describe("pageRoutesPlugin", ...)` block, after the `closeBundle` describe:

```js
describe("transformIndexHtml hook", () => {
    const verivaliaHtml = `<html><body>
<script data-name="BMC-Widget" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"></script>
<div style="display: none">Powered by Verifalia <a href="https://verifalia.com/">email verifier</a></div>
<script defer
        src="https://unpkg.com/verifalia-widget@1.10.0/dist/verifalia-widget.js"
        data-verifalia-appkey="abc123"
        integrity="sha512-xyz"
        crossorigin="anonymous"></script>
</body></html>`;

    it("strips Verifalia script and attribution in serve mode", () => {
        existsSync.mockReturnValue(true);
        readdirSync.mockReturnValue([]);
        plugin.config({root: "/project"});
        plugin.configureServer({middlewares: {use: vi.fn()}});

        const result = plugin.transformIndexHtml(verivaliaHtml);

        expect(result).not.toContain("Verifalia");
        expect(result).not.toContain("verifalia-widget");
        expect(result).toContain("BMC-Widget");
    });

    it("preserves HTML unchanged in build mode (no configureServer called)", () => {
        existsSync.mockReturnValue(true);
        readdirSync.mockReturnValue([]);
        plugin.config({root: "/project"});

        const result = plugin.transformIndexHtml(verivaliaHtml);

        expect(result).toContain("Verifalia");
        expect(result).toContain("verifalia-widget");
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/vitePageRoutes.spec.js`
Expected: FAIL — `plugin.transformIndexHtml is not a function`

- [ ] **Step 3: Implement transformIndexHtml**

Modify `src/vitePageRoutes.js`. Add `let isServing = false;` after the existing `let` declarations (line 32-33). Set `isServing = true` at the start of `configureServer`. Add the `transformIndexHtml` method to the returned plugin object:

```js
export function pageRoutesPlugin() {
    let pages = [];
    let root = process.cwd();
    let isServing = false;

    return {
        name: 'vite-page-routes',

        config(config) {
            // ... unchanged
        },

        configureServer(server) {
            isServing = true;
            // ... rest unchanged
        },

        transformIndexHtml(html) {
            if (!isServing) return html;
            return html
                .replace(/<div[^>]*>Powered by Verifalia[\s\S]*?<\/div>/, '')
                .replace(/<script[^>]*verifalia-widget[\s\S]*?<\/script>/, '');
        },

        closeBundle() {
            // ... unchanged
        },
    };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/vitePageRoutes.spec.js`
Expected: All tests pass (existing + 2 new)

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass — no regressions

- [ ] **Step 6: Commit**

```
feat: strip Verifalia widget in dev mode for @fail.test email testing
```
