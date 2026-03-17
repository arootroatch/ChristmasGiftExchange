# Postmark Direct API Migration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Netlify email plugin with direct Postmark API calls for email sending.

**Architecture:** The only production code change is in `sendNotificationEmail()` in `giverNotification.mjs` — it currently POSTs to Netlify's email function and will instead import the template module, render HTML, and POST to Postmark's `/email` endpoint. An `escapeHtml` utility is added and applied to all 6 email templates. Cleanup removes the old Netlify plugin config and Handlebars templates.

**Tech Stack:** Postmark HTTP API, existing JS email template modules, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-postmark-migration-design.md`

---

## Chunk 1: Core — escapeHtml utility + sendNotificationEmail rewrite + tests

### Task 1: Create `escapeHtml` utility with tests

**Files:**
- Create: `netlify/shared/emails/escapeHtml.mjs`
- Create: `spec/netlify-functions/escapeHtml.spec.js`

- [ ] **Step 1: Write the failing test**

Create `spec/netlify-functions/escapeHtml.spec.js`:

```js
import {describe, it, expect} from 'vitest';
import {escapeHtml} from '../../netlify/shared/emails/escapeHtml.mjs';

describe('escapeHtml', () => {
    it('escapes ampersands', () => {
        expect(escapeHtml('a&b')).toBe('a&amp;b');
    });

    it('escapes less-than', () => {
        expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('escapes double quotes', () => {
        expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
    });

    it('escapes single quotes', () => {
        expect(escapeHtml("it's")).toBe("it&#39;s");
    });

    it('returns empty string for null', () => {
        expect(escapeHtml(null)).toBe('');
    });

    it('returns empty string for undefined', () => {
        expect(escapeHtml(undefined)).toBe('');
    });

    it('converts numbers to string', () => {
        expect(escapeHtml(42)).toBe('42');
    });

    it('handles strings with no special characters', () => {
        expect(escapeHtml('hello world')).toBe('hello world');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/netlify-functions/escapeHtml.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

Create `netlify/shared/emails/escapeHtml.mjs`:

```js
export function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/netlify-functions/escapeHtml.spec.js`
Expected: PASS — all 8 tests green

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/emails/escapeHtml.mjs spec/netlify-functions/escapeHtml.spec.js
git commit -m "feat: add escapeHtml utility for email template security"
```

---

### Task 2: Rewrite `sendNotificationEmail()` to use Postmark API

**Files:**
- Modify: `netlify/shared/giverNotification.mjs:71-96`
- Modify: `spec/netlify-functions/giverNotification.spec.js`

- [ ] **Step 1: Update `sendNotificationEmail` tests for new Postmark behavior**

In `spec/netlify-functions/giverNotification.spec.js`, the two `describe` blocks need updates.

**In the `sendNotificationEmail` describe block** (line 91–127), replace the env var setup, cleanup, and the URL assertion test:

Change `beforeAll` (lines 94–102):
```js
// Old:
process.env.CONTEXT = 'production';
process.env.URL = 'https://production.netlify.app';
process.env.NETLIFY_EMAILS_SECRET = 'test-secret';

// New:
process.env.CONTEXT = 'production';
process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
```

Change `afterAll` (lines 110–115):
```js
// Old:
delete process.env.CONTEXT;
delete process.env.URL;
delete process.env.NETLIFY_EMAILS_SECRET;

// New:
delete process.env.CONTEXT;
delete process.env.POSTMARK_SERVER_TOKEN;
```

Replace the `'always uses process.env.URL'` test (lines 117–126) with tests for Postmark behavior:

```js
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
```

**In the `sendEmailsWithRetry` describe block** (line 2–89), update env vars:

Change `beforeAll` (lines 6–13):
```js
// Old:
process.env.CONTEXT = 'production';
process.env.URL = 'https://test.netlify.app';
process.env.NETLIFY_EMAILS_SECRET = 'test-secret';

// New:
process.env.CONTEXT = 'production';
process.env.URL = 'https://test.netlify.app';
process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
```

Note: `URL` is still needed here because `sendEmailsWithRetry` uses `absoluteUrl()` which reads `process.env.URL`.

Change `afterAll` (lines 20–25):
```js
// Old:
delete process.env.CONTEXT;
delete process.env.URL;
delete process.env.NETLIFY_EMAILS_SECRET;

// New:
delete process.env.CONTEXT;
delete process.env.URL;
delete process.env.POSTMARK_SERVER_TOKEN;
```

The `'sends correct email parameters'` test (lines 65–79) needs to be updated. The old test inspects `body.parameters.name` etc. — now the body is `{From, To, Subject, HtmlBody}`, so assertions must change:

```js
it('sends correct email parameters', async () => {
    fetch.mockResolvedValue({ok: true});
    await sendEmailsWithRetry(participants, assignments, userByEmail, 'exchange-123');

    const calls = fetch.mock.calls;
    expect(calls).toHaveLength(2);

    const alexCall = calls.find(c => {
        const b = JSON.parse(c[1].body);
        return b.To === 'alex@test.com';
    });

    const body = JSON.parse(alexCall[1].body);
    expect(body.To).toBe('alex@test.com');
    expect(body.HtmlBody).toContain('Alex');
    expect(body.HtmlBody).toContain('Whitney');
    expect(body.HtmlBody).toContain('https://test.netlify.app/wishlist/edit/alex-token');
    expect(body.HtmlBody).toContain('https://test.netlify.app/wishlist/view/alex-token?exchange=exchange-123');
});
```

The `'sets wishlistEditUrl to null when user not in userByEmail'` test (lines 81–88) should check that the wishlist CTA is absent:

```js
it('omits wishlist CTA when user not in userByEmail', async () => {
    fetch.mockResolvedValue({ok: true});
    await sendEmailsWithRetry(participants, assignments, {}, 'exchange-123');

    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.HtmlBody).not.toContain('Add Your Wishlist');
    expect(body.HtmlBody).not.toContain("Wish List");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/giverNotification.spec.js`
Expected: FAIL — old implementation doesn't match new assertions

- [ ] **Step 3: Rewrite `sendNotificationEmail()` in `giverNotification.mjs`**

Replace lines 71–96 of `netlify/shared/giverNotification.mjs` with:

```js
const templateModules = {
    "secret-santa": () => import("./emails/secretSanta.mjs"),
    "results-summary": () => import("./emails/resultsSummary.mjs"),
    "wishlist-notification": () => import("./emails/wishlistNotification.mjs"),
    "contact-info": () => import("./emails/contactInfo.mjs"),
    "error-alert": () => import("./emails/errorAlert.mjs"),
    "wishlist-link": () => import("./emails/wishlistLink.mjs"),
};

export async function sendNotificationEmail(templateName, to, subject, parameters) {
    if (process.env.CONTEXT === "dev") {
        console.log(`[DEV EMAIL] Template: ${templateName} | To: ${to} | Subject: ${subject}`);
        console.log("[DEV EMAIL] Parameters:", JSON.stringify(parameters, null, 2));
        return;
    }

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
}
```

Also remove the now-unused `process.env.URL` reference — the old code used `${baseUrl}/.netlify/functions/emails/...`. The new code doesn't need `URL` in `sendNotificationEmail`. (Note: `absoluteUrl()` in `sendEmailsWithRetry` still uses `URL` — that's fine, it's a different function.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/giverNotification.spec.js`
Expected: PASS — all tests green

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/giverNotification.mjs spec/netlify-functions/giverNotification.spec.js
git commit -m "feat: replace Netlify email plugin with Postmark API in sendNotificationEmail"
```

> **Note:** After this commit, downstream endpoint tests (api-giver-notify-post, api-user-wishlist-put, etc.) will fail if run, because they still assert against the old `{from, to, subject, parameters}` body format. This is expected. Run only scoped tests (`spec/netlify-functions/giverNotification.spec.js`) until Chunks 2 and 3 are complete.

---

## Chunk 2: HTML escaping in all 6 email templates

### Task 3: Add escapeHtml to `secretSanta.mjs`

**Files:**
- Modify: `netlify/shared/emails/secretSanta.mjs:1-59`

- [ ] **Step 1: Add import and escape all interpolated values**

Add import at top of file:
```js
import {escapeHtml} from './escapeHtml.mjs';
```

In the `render()` function, escape all interpolated values. Replace each interpolation:
- `${wishlistEditUrl}` in href → `${escapeHtml(wishlistEditUrl)}`
- `${wishlistViewUrl}` in href → `${escapeHtml(wishlistViewUrl)}`
- `${recipient}` in display text (line 29) → `${escapeHtml(recipient)}`
- `${name}` (line 38) → `${escapeHtml(name)}`
- `${recipient}` in "Your gift exchange recipient is..." (line 48) → `${escapeHtml(recipient)}`

- [ ] **Step 2: Run full test suite to verify no regressions**

Run: `npx vitest run`
Expected: PASS — escaping doesn't break existing tests (test data has no special characters)

- [ ] **Step 3: Commit**

```bash
git add netlify/shared/emails/secretSanta.mjs
git commit -m "feat: add HTML escaping to secretSanta email template"
```

---

### Task 4: Add escapeHtml to `resultsSummary.mjs`

**Files:**
- Modify: `netlify/shared/emails/resultsSummary.mjs:1-34`

- [ ] **Step 1: Add import and escape interpolated values**

Add import:
```js
import {escapeHtml} from './escapeHtml.mjs';
```

Escape in `render()`:
- `${a.giver}` (line 6) → `${escapeHtml(a.giver)}`
- `${a.recipient}` (line 8) → `${escapeHtml(a.recipient)}`
- `${name}` (line 14) → `${escapeHtml(name)}`

- [ ] **Step 2: Run tests and commit**

Run: `npx vitest run`
Expected: PASS

```bash
git add netlify/shared/emails/resultsSummary.mjs
git commit -m "feat: add HTML escaping to resultsSummary email template"
```

---

### Task 5: Add escapeHtml to `wishlistNotification.mjs`

**Files:**
- Modify: `netlify/shared/emails/wishlistNotification.mjs:1-25`

- [ ] **Step 1: Add import and escape interpolated values**

Add import:
```js
import {escapeHtml} from './escapeHtml.mjs';
```

Escape:
- `${recipientName}` (line 13) → `${escapeHtml(recipientName)}`
- `${wishlistViewUrl}` in href (line 18) → `${escapeHtml(wishlistViewUrl)}`

- [ ] **Step 2: Run tests and commit**

Run: `npx vitest run`
Expected: PASS

```bash
git add netlify/shared/emails/wishlistNotification.mjs
git commit -m "feat: add HTML escaping to wishlistNotification email template"
```

---

### Task 6: Add escapeHtml to `contactInfo.mjs`

**Files:**
- Modify: `netlify/shared/emails/contactInfo.mjs:1-33`

- [ ] **Step 1: Add import and escape interpolated values**

Add import:
```js
import {escapeHtml} from './escapeHtml.mjs';
```

Escape:
- `${recipientName}` (line 12) → `${escapeHtml(recipientName)}`
- `${address}` (line 20) → `${escapeHtml(address)}`
- `${phone}` (line 24) → `${escapeHtml(phone)}`
- `${notes}` (line 28) → `${escapeHtml(notes)}`

- [ ] **Step 2: Run tests and commit**

Run: `npx vitest run`
Expected: PASS

```bash
git add netlify/shared/emails/contactInfo.mjs
git commit -m "feat: add HTML escaping to contactInfo email template"
```

---

### Task 7: Add escapeHtml to `errorAlert.mjs`

**Files:**
- Modify: `netlify/shared/emails/errorAlert.mjs:1-34`

Note: `errorAlert` is standalone HTML (no layout wrapper).

- [ ] **Step 1: Add import and escape interpolated values**

Add import:
```js
import {escapeHtml} from './escapeHtml.mjs';
```

Escape:
- `${endpoint}` (line 18) → `${escapeHtml(endpoint)}`
- `${timestamp}` (line 23) → `${escapeHtml(timestamp)}`
- `${stackTrace}` (line 28) → `${escapeHtml(stackTrace)}`

- [ ] **Step 2: Run tests and commit**

Run: `npx vitest run`
Expected: PASS

```bash
git add netlify/shared/emails/errorAlert.mjs
git commit -m "feat: add HTML escaping to errorAlert email template"
```

---

### Task 8: Add escapeHtml to `wishlistLink.mjs`

**Files:**
- Modify: `netlify/shared/emails/wishlistLink.mjs:1-20`

- [ ] **Step 1: Add import and escape interpolated values**

Add import:
```js
import {escapeHtml} from './escapeHtml.mjs';
```

Escape:
- `${recipientName}` (line 8) → `${escapeHtml(recipientName)}`
- `${wishlistViewUrl}` in href (line 13) → `${escapeHtml(wishlistViewUrl)}`
- `${recipientName}` (line 16) → `${escapeHtml(recipientName)}`

- [ ] **Step 2: Run tests and commit**

Run: `npx vitest run`
Expected: PASS

```bash
git add netlify/shared/emails/wishlistLink.mjs
git commit -m "feat: add HTML escaping to wishlistLink email template"
```

---

## Chunk 3: Test updates for downstream endpoint specs

All these tests currently mock `fetch` and assert against the old Netlify email plugin request format. They need to assert against the new Postmark format: URL is `https://api.postmarkapp.com/email`, body shape is `{From, To, Subject, HtmlBody}`, and env var is `POSTMARK_SERVER_TOKEN`.

### Task 9: Update `api-giver-notify-post.spec.js`

**Files:**
- Modify: `spec/netlify-functions/api-giver-notify-post.spec.js`

- [ ] **Step 1: Update env var references**

In `beforeAll` (line 19): `process.env.NETLIFY_EMAILS_SECRET = 'test-secret-key'` → `process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token'`

In `afterAll` (line 46): `delete process.env.NETLIFY_EMAILS_SECRET` → `delete process.env.POSTMARK_SERVER_TOKEN`

- [ ] **Step 2: Add `text()` to all `{ok: false}` response mocks**

The new `sendNotificationEmail` calls `response.text()` on error. Any test that mocks `{ok: false}` must also provide `text: () => Promise.resolve('error message')`. In this file, the `'counts emails that return non-OK response'` test (lines 193–208) uses `{ok: false, status: 500, statusText: 'Internal Server Error'}` — add `text: () => Promise.resolve('Server Error')` to each failed response mock.

- [ ] **Step 3: Update email body assertions**

The test `'sends one email per assignment with correct parameters'` (lines 93–109) inspects `body.parameters.name`, `body.to`, `body.parameters.recipient`, `body.parameters.wishlistEditUrl`. Update:

```js
it('sends one email per assignment with correct parameters', async () => {
    const event = buildEvent(bulkPayload);
    const response = await handler(event);

    expect(response.statusCode).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(3);

    const calls = mockFetch.mock.calls;
    const bodies = calls.map(c => JSON.parse(c[1].body));

    const alexEmail = bodies.find(b => b.To === 'alex@test.com');
    expect(alexEmail.HtmlBody).toContain('Whitney');
    expect(alexEmail.HtmlBody).toContain(
        `https://test.netlify.app/wishlist/edit/${alexToken}`
    );
});
```

The test `'builds wishlistEditUrl from DB token'` (lines 111–125) — update similarly:

```js
it('builds wishlistEditUrl from DB token and process.env.URL', async () => {
    const event = buildEvent(bulkPayload);
    await handler(event);

    const calls = mockFetch.mock.calls;
    const bodies = calls.map(c => JSON.parse(c[1].body));

    bodies.forEach(body => {
        const tokenMap = {Alex: alexToken, Whitney: whitneyToken, Hunter: hunterToken};
        const matchedName = Object.keys(tokenMap).find(name =>
            body.HtmlBody.includes(`Greetings, ${name}`)
        );
        expect(body.HtmlBody).toContain(
            `https://test.netlify.app/wishlist/edit/${tokenMap[matchedName]}`
        );
    });
});
```

The test `'sends error-alert email to admin when emails fail'` (lines 171–191) checks `c[0].includes('error-alert')`. Now the URL is always `https://api.postmarkapp.com/email`, so identify the error-alert call by checking `HtmlBody` contains "Server Error":

```js
it('sends error-alert email to admin when emails fail after retries', async () => {
    mockFetch
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce({ok: true})
        .mockResolvedValueOnce({ok: true})
        .mockResolvedValueOnce({ok: true});

    const event = buildEvent(bulkPayload);
    await handler(event);

    const calls = mockFetch.mock.calls;
    const errorAlertCall = calls.find(c => {
        const body = JSON.parse(c[1].body);
        return body.HtmlBody && body.HtmlBody.includes('Server Error');
    });
    expect(errorAlertCall).toBeDefined();
    const alertBody = JSON.parse(errorAlertCall[1].body);
    expect(alertBody.HtmlBody).toContain('api-giver-notify-post');
    expect(alertBody.HtmlBody).toContain('alex@test.com');
});
```

The test `'sets wishlistEditUrl to null when user not found in DB'` (lines 210–221) — update:

```js
it('omits wishlist CTA when user not found in DB', async () => {
    await db.collection('users').deleteOne({email: 'alex@test.com'});

    const event = buildEvent(bulkPayload);
    await handler(event);

    const calls = mockFetch.mock.calls;
    const bodies = calls.map(c => JSON.parse(c[1].body));
    const alexEmail = bodies.find(b => b.HtmlBody && b.HtmlBody.includes('Greetings, Alex'));
    expect(alexEmail.HtmlBody).not.toContain('Add Your Wishlist');
});
```

The test `'handles names with special characters'` (lines 223–240) — update to check escaped HTML:

```js
it('handles names with special characters', async () => {
    await db.collection('users').insertOne({
        name: "O'Brien", email: 'obrien@test.com', token: crypto.randomUUID(), wishlists: [], wishItems: [],
    });

    const event = buildEvent({
        exchangeId: 'test-exchange-id',
        participants: [{name: "O'Brien", email: 'obrien@test.com'}],
        assignments: [{giver: "O'Brien", recipient: 'Whitney'}],
    });

    await handler(event);

    const call = mockFetch.mock.calls[0];
    const body = JSON.parse(call[1].body);
    expect(body.HtmlBody).toContain('O&#39;Brien');
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-giver-notify-post.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add spec/netlify-functions/api-giver-notify-post.spec.js
git commit -m "test: update api-giver-notify-post tests for Postmark API format"
```

---

### Task 10: Update `api-user-wishlist-put.spec.js`

**Files:**
- Modify: `spec/netlify-functions/api-user-wishlist-put.spec.js`

- [ ] **Step 1: Update env var references**

In `beforeAll` (line 15): `NETLIFY_EMAILS_SECRET` → `POSTMARK_SERVER_TOKEN`
In `afterAll` (line 36): `delete process.env.NETLIFY_EMAILS_SECRET` → `delete process.env.POSTMARK_SERVER_TOKEN`

- [ ] **Step 2: Update the notification email assertion**

In `'notifies givers on first wishlist submission'` (lines 139–143):

```js
// Old:
expect(fetchCall[0]).toBe('https://test.netlify.app/.netlify/functions/emails/wishlist-notification');
const emailBody = JSON.parse(fetchCall[1].body);
expect(emailBody.to).toBe('giver@test.com');
expect(emailBody.parameters.recipientName).toBe('Whitney');

// New:
expect(fetchCall[0]).toBe('https://api.postmarkapp.com/email');
const emailBody = JSON.parse(fetchCall[1].body);
expect(emailBody.To).toBe('giver@test.com');
expect(emailBody.HtmlBody).toContain('Whitney');
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-user-wishlist-put.spec.js`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add spec/netlify-functions/api-user-wishlist-put.spec.js
git commit -m "test: update api-user-wishlist-put tests for Postmark API format"
```

---

### Task 11: Update `api-user-contact-post.spec.js`

**Files:**
- Modify: `spec/netlify-functions/api-user-contact-post.spec.js`

- [ ] **Step 1: Update env var references**

In `beforeAll` (line 15): `NETLIFY_EMAILS_SECRET` → `POSTMARK_SERVER_TOKEN`
In `afterAll` (line 36): `delete process.env.NETLIFY_EMAILS_SECRET` → `delete process.env.POSTMARK_SERVER_TOKEN`

- [ ] **Step 2: Update the email assertion**

In `'emails givers with contact info'` (lines 108–118):

```js
// Old:
expect(fetchCall[0]).toBe('https://test.netlify.app/.netlify/functions/emails/contact-info');
const emailBody = JSON.parse(fetchCall[1].body);
expect(emailBody.to).toBe('giver@test.com');
expect(emailBody.parameters.recipientName).toBe('Whitney');
expect(emailBody.parameters.address).toBe('123 Main St, Springfield');
expect(emailBody.parameters.phone).toBe('555-1234');
expect(emailBody.parameters.notes).toBe('Leave at front door');

// New:
expect(fetchCall[0]).toBe('https://api.postmarkapp.com/email');
const emailBody = JSON.parse(fetchCall[1].body);
expect(emailBody.To).toBe('giver@test.com');
expect(emailBody.HtmlBody).toContain('Whitney');
expect(emailBody.HtmlBody).toContain('123 Main St, Springfield');
expect(emailBody.HtmlBody).toContain('555-1234');
expect(emailBody.HtmlBody).toContain('Leave at front door');
```

In `'defaults missing contact fields to fallback text'` (lines 211–215):

```js
// Old:
expect(emailBody.parameters.address).toBe('Not provided');
expect(emailBody.parameters.phone).toBe('Not provided');
expect(emailBody.parameters.notes).toBe('None');

// New:
expect(emailBody.HtmlBody).toContain('Not provided');
expect(emailBody.HtmlBody).toContain('None');
```

- [ ] **Step 3: Run tests and commit**

Run: `npx vitest run spec/netlify-functions/api-user-contact-post.spec.js`
Expected: PASS

```bash
git add spec/netlify-functions/api-user-contact-post.spec.js
git commit -m "test: update api-user-contact-post tests for Postmark API format"
```

---

### Task 12: Update `api-wishlist-email-post.spec.js`

**Files:**
- Modify: `spec/netlify-functions/api-wishlist-email-post.spec.js`

- [ ] **Step 1: Update env var references**

In `beforeAll` (line 18): `NETLIFY_EMAILS_SECRET` → `POSTMARK_SERVER_TOKEN`
In `afterAll` (line 52): `delete process.env.NETLIFY_EMAILS_SECRET` → `delete process.env.POSTMARK_SERVER_TOKEN`

- [ ] **Step 2: Update email assertions**

In `'sends wishlist link email and returns 200'` (lines 91–105):

```js
// Old:
const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
expect(callBody.to).toBe('alex@test.com');
expect(callBody.parameters.recipientName).toBe('Hunter');
expect(callBody.parameters.wishlistViewUrl).toBe(
    `https://test.netlify.app/wishlist/view/${giverToken}?exchange=${exchangeId}`
);

// New:
const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
expect(callBody.To).toBe('alex@test.com');
expect(callBody.HtmlBody).toContain('Hunter');
expect(callBody.HtmlBody).toContain(
    `https://test.netlify.app/wishlist/view/${giverToken}?exchange=${exchangeId}`
);
```

- [ ] **Step 3: Run tests and commit**

Run: `npx vitest run spec/netlify-functions/api-wishlist-email-post.spec.js`
Expected: PASS

```bash
git add spec/netlify-functions/api-wishlist-email-post.spec.js
git commit -m "test: update api-wishlist-email-post tests for Postmark API format"
```

---

### Task 13: Update `api-exchange-post.spec.js`

**Files:**
- Modify: `spec/netlify-functions/api-exchange-post.spec.js`

- [ ] **Step 1: Update env var references**

In `beforeAll` (line 13): `process.env.NETLIFY_EMAILS_SECRET = 'test-secret'` → `process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token'`

In `afterAll` (line 29): `delete process.env.NETLIFY_EMAILS_SECRET` → `delete process.env.POSTMARK_SERVER_TOKEN`

- [ ] **Step 2: Scan for any email body assertions and update if present**

Read the full file for any assertions that reference `parameters`, `netlify-emails-secret`, or the old URL pattern, and update them to the Postmark format.

- [ ] **Step 3: Run tests and commit**

Run: `npx vitest run spec/netlify-functions/api-exchange-post.spec.js`
Expected: PASS

```bash
git add spec/netlify-functions/api-exchange-post.spec.js
git commit -m "test: update api-exchange-post tests for Postmark env var"
```

---

### Task 14: Update `api-exchange-post.contract.spec.js`

**Files:**
- Modify: `spec/integration/api-exchange-post.contract.spec.js`

- [ ] **Step 1: Update env var references**

In `beforeAll` (line 11): `process.env.NETLIFY_EMAILS_SECRET = 'test-secret'` → `process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token'`

In `afterAll` (line 22): `delete process.env.NETLIFY_EMAILS_SECRET` → `delete process.env.POSTMARK_SERVER_TOKEN`

- [ ] **Step 2: Run tests and commit**

Run: `npx vitest run spec/integration/api-exchange-post.contract.spec.js`
Expected: PASS

```bash
git add spec/integration/api-exchange-post.contract.spec.js
git commit -m "test: update api-exchange-post contract test for Postmark env var"
```

---

### Task 15: Verify contract tests and no-change test files

**Files (read-only verification):**
- `spec/integration/api-giver-notify-post.contract.spec.js`
- `spec/integration/api-user-contact-post.contract.spec.js`
- `spec/integration/api-user-wishlist-put.contract.spec.js`
- `spec/netlify-functions/api-results-email-post.spec.js`
- `spec/netlify-functions/middleware.spec.js`

These tests exercise `sendNotificationEmail` through the real code path (contract tests) or mock it entirely (middleware). They don't set `NETLIFY_EMAILS_SECRET`.

- [ ] **Step 1: Run the 3 contract tests that stub fetch but don't set the old env var**

```bash
npx vitest run spec/integration/api-giver-notify-post.contract.spec.js spec/integration/api-user-contact-post.contract.spec.js spec/integration/api-user-wishlist-put.contract.spec.js
```

Expected: PASS — these tests stub `fetch` globally, so the Postmark call succeeds with `{ok: true}`. The dynamic template imports resolve to real files.

- [ ] **Step 2: Run api-results-email-post and middleware tests**

```bash
npx vitest run spec/netlify-functions/api-results-email-post.spec.js spec/netlify-functions/middleware.spec.js
```

Expected: PASS — `api-results-email-post` uses `CONTEXT=dev` (console.log skip), `middleware` mocks `sendNotificationEmail` entirely.

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

---

## Chunk 4: Cleanup

### Task 16: Remove Netlify email plugin from `netlify.toml`

**Files:**
- Modify: `netlify.toml`

- [ ] **Step 1: Remove the plugin config**

Remove these blocks from `netlify.toml`:

```toml
[functions.emails]
  included_files = ["./emails/**"]
```

and:

```toml
[[plugins]]
  package = "@netlify/plugin-emails"
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add netlify.toml
git commit -m "chore: remove Netlify email plugin from config"
```

---

### Task 17: Delete old `emails/` Handlebars templates

**Files:**
- Delete: `emails/` directory (contains `contact-info/`, `error-alert/`, `results-summary/`, `secret-santa/`, `wishlist-notification/`)

- [ ] **Step 1: Delete the directory**

```bash
rm -rf emails/
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: PASS — nothing references these files

- [ ] **Step 3: Commit**

```bash
git add -A emails/
git commit -m "chore: delete old Handlebars email templates (replaced by JS modules)"
```

---

### Task 18: Final verification — run full test suite

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 2: Verify no references to old system remain**

```bash
grep -r "NETLIFY_EMAILS_SECRET" netlify/ spec/ --include="*.mjs" --include="*.js"
grep -r "/.netlify/functions/emails" netlify/ spec/ --include="*.mjs" --include="*.js"
grep -r "netlify-emails-secret" netlify/ spec/ --include="*.mjs" --include="*.js"
```

All three should return zero matches.
