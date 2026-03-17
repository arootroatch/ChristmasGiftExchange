# Batch Email API + Giver Notification Scoping — Design Spec

## Overview

Three changes: (1) switch from sequential email sends to Postmark's batch API for bulk email endpoints, (2) rename `api-giver-notify-post` to `api-giver-retry-post` to reflect its retry intent, (3) scope `forEachGiverOf` to only the most recent exchange instead of all exchanges.

## 1. Postmark Batch API

### Current behavior

`sendEmailsWithRetry()` in `giverNotification.mjs` sends emails one at a time in a loop, retrying each up to 3 times. Called by:
- `api-giver-retry-post.mjs` (retry endpoint)
- `api-exchange-post.mjs` (initial exchange creation)

### New behavior

Rename `sendEmailsWithRetry` → `sendBatchEmails`. Build all messages upfront, POST to `https://api.postmarkapp.com/email/batch` in a single call.

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

New function `sendBatchNotificationEmails(messages)`:

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
        .map((r, i) => postmarkMessages[i].To);

    return {emailsFailed};
}
```

Key differences from old approach:
- Single HTTP call instead of N calls
- No retry loop — Postmark returns per-message status
- `emailsFailed` derived from Postmark's response `ErrorCode` field
- `sendNotificationEmail()` is unchanged — still used for single emails (error alerts, wishlist notifications, etc.)

### Callers — minimal changes

- `api-giver-retry-post.mjs`: import `sendBatchEmails` instead of `sendEmailsWithRetry`
- `api-exchange-post.mjs`: import `sendBatchEmails` instead of `sendEmailsWithRetry`
- Both already handle the `{emailsFailed}` return value — no change to response shape

## 2. Rename `api-giver-notify-post` → `api-giver-retry-post`

### Files to rename

| Old | New |
|-----|-----|
| `netlify/functions/api-giver-notify-post.mjs` | `netlify/functions/api-giver-retry-post.mjs` |
| `spec/netlify-functions/api-giver-notify-post.spec.js` | `spec/netlify-functions/api-giver-retry-post.spec.js` |
| `spec/integration/api-giver-notify-post.contract.spec.js` | `spec/integration/api-giver-retry-post.contract.spec.js` |

### References to update

| File | Change |
|------|--------|
| `src/exchange/components/EmailTable/EmailTable.js:190` | URL: `api-giver-notify-post` → `api-giver-retry-post` |
| `src/exchange/components/EmailTable/FailedEmails.js:72` | URL: `api-giver-notify-post` → `api-giver-retry-post` |
| `spec/exchange/components/EmailTable/EmailTable.spec.js:514,522` | Update URL in test assertions |
| Inside `api-giver-retry-post.mjs:41` | Error alert `endpoint` string |
| Inside `spec/netlify-functions/api-giver-retry-post.spec.js:191` | Update assertion for endpoint name |

## 3. Scope `forEachGiverOf` to Most Recent Exchange

### Current behavior

`forEachGiverOf(recipientUser, callback)` finds ALL exchanges containing this user as a recipient and calls the callback for EVERY giver across all exchanges.

### New behavior

Find only the most recent exchange for this user (by `createdAt` descending) and call the callback for just that exchange's giver.

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

Key difference: `find().toArray()` + loop over all exchanges → `findOne()` with `sort: {createdAt: -1}` for just the latest.

### Callers — no changes needed

- `api-user-wishlist-put.mjs` — calls `forEachGiverOf`, works unchanged
- `api-user-contact-post.mjs` — calls `forEachGiverOf`, works unchanged

Both still iterate over the callback results — they just get fewer callbacks now (only from the latest exchange).

### Why this is safe

A user can only be a recipient of one giver per exchange (one assignment per recipient per exchange). So `forEachGiverOf` with the most recent exchange will call the callback exactly once — for the one giver assigned to this recipient in that exchange.

## Test Updates

### `giverNotification.spec.js`

- Rename `sendEmailsWithRetry` describe → `sendBatchEmails`
- Replace retry tests with batch behavior tests:
  - Returns `{emailsFailed: []}` when batch succeeds (all `ErrorCode: 0`)
  - Returns failed emails when some have non-zero `ErrorCode`
  - Sends single POST to `/email/batch` (not N individual calls)
  - Verify Postmark batch body is an array of `{From, To, Subject, HtmlBody}` objects
- Add `sendBatchNotificationEmails` tests
- `forEachGiverOf` tests: test that only the most recent exchange's giver is called

### Endpoint test files

- `api-giver-retry-post.spec.js`: update import path, endpoint name in assertions, remove retry-specific tests (no more 3-attempt retry), update mock expectations for single batch call instead of N individual calls
- `api-exchange-post.spec.js`: update import name
- `api-user-wishlist-put.spec.js`: add test verifying only most recent exchange's giver is notified
- `api-user-contact-post.spec.js`: add test verifying only most recent exchange's giver gets contact info

### Contract tests

- Rename file, update describe block and import path

## No Changes Needed

- `sendNotificationEmail()` — unchanged, still used for single emails
- `api-user-wishlist-put.mjs` / `api-user-contact-post.mjs` — unchanged, `forEachGiverOf` signature preserved
- `api-results-email-post.mjs` — sends single email, not affected
- `api-wishlist-email-post.mjs` — sends single email, not affected
