# Postmark Direct API Migration — Design Spec

## Overview

Migrate email sending from Netlify's `@netlify/plugin-emails` to the Postmark API directly. Use Postmark sandbox token for staging/preview deploys, real token for production, and keep console.log skip for local dev.

## Core Change: `sendNotificationEmail()`

Located in `netlify/shared/giverNotification.mjs`. The only function that sends emails.

### Current behavior

1. If `CONTEXT === "dev"`, log to console and return
2. Otherwise, POST to `${URL}/.netlify/functions/emails/${templateName}` with `netlify-emails-secret` header

### New behavior

1. If `CONTEXT === "dev"`, log to console and return (unchanged)
2. Otherwise:
   - Look up template module by name from a static map
   - Dynamic-import the module and call `render(parameters)` to get HTML
   - POST to `https://api.postmarkapp.com/email` with:
     - Headers: `X-Postmark-Server-Token: ${POSTMARK_SERVER_TOKEN}`, `Content-Type: application/json`, `Accept: application/json`
     - Body: `{From: "alex@soundrootsproductions.com", To, Subject, HtmlBody}`
   - `From` address must be a verified sender in Postmark
   - On failure, include Postmark's response body and template name in the error message

### Template name → module map

```js
const templateModules = {
    "secret-santa": () => import("./emails/secretSanta.mjs"),
    "results-summary": () => import("./emails/resultsSummary.mjs"),
    "wishlist-notification": () => import("./emails/wishlistNotification.mjs"),
    "contact-info": () => import("./emails/contactInfo.mjs"),
    "error-alert": () => import("./emails/errorAlert.mjs"),
    "wishlist-link": () => import("./emails/wishlistLink.mjs"),
};
```

### Environment configuration

| Environment | `CONTEXT` | `POSTMARK_SERVER_TOKEN` | Behavior |
|---|---|---|---|
| Local dev (`netlify dev`) | `"dev"` | not needed | Console.log, no email sent |
| Staging / deploy preview | `"deploy-preview"` or `"branch-deploy"` | Sandbox token | Emails sent to Postmark sandbox (not delivered, visible in activity log) |
| Production | `"production"` | Real server token | Emails delivered |

## HTML Escaping

Add `escapeHtml(str)` to `netlify/shared/emails/escapeHtml.mjs`:

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

Update all 6 template `render()` functions to escape user-supplied interpolated values. `layout.mjs` has no user data interpolation — no changes needed.

### What to escape per template

| Template | Values to escape |
|---|---|
| `secretSanta` | `name`, `recipient`, `wishlistEditUrl`, `wishlistViewUrl` |
| `resultsSummary` | `name`, each `assignment.giver`, each `assignment.recipient` |
| `wishlistNotification` | `recipientName`, `wishlistViewUrl` |
| `contactInfo` | `recipientName`, `address`, `phone`, `notes` |
| `errorAlert` | `endpoint`, `timestamp`, `stackTrace` (standalone HTML, no layout wrapper) |
| `wishlistLink` | `recipientName`, `wishlistViewUrl` |

## Cleanup

### `netlify.toml`

Remove:
```toml
[functions.emails]
  included_files = ["./emails/**"]

[[plugins]]
  package = "@netlify/plugin-emails"
```

### `emails/` directory

Delete entirely — old Handlebars templates superseded by JS modules in `netlify/shared/emails/`.

### Env vars (manual, in Netlify dashboard)

- Remove: `NETLIFY_EMAILS_SECRET`
- Add: `POSTMARK_SERVER_TOKEN` (real token for production, sandbox token for staging)

## Test Updates

All test files that mock email sending need updates:

### Files to update

- `spec/netlify-functions/giverNotification.spec.js`
- `spec/netlify-functions/api-giver-notify-post.spec.js`
- `spec/netlify-functions/api-exchange-post.spec.js` (sets `NETLIFY_EMAILS_SECRET`)
- `spec/netlify-functions/api-user-wishlist-put.spec.js`
- `spec/netlify-functions/api-user-contact-post.spec.js`
- `spec/netlify-functions/api-wishlist-email-post.spec.js`
- `spec/netlify-functions/api-results-email-post.spec.js`
- `spec/netlify-functions/middleware.spec.js` (if it tests error-alert sending)
- `spec/integration/api-exchange-post.contract.spec.js` (sets `NETLIFY_EMAILS_SECRET`)
- `spec/integration/api-giver-notify-post.contract.spec.js`
- `spec/integration/api-user-contact-post.contract.spec.js`
- `spec/integration/api-user-wishlist-put.contract.spec.js`

### What changes in each test

| Aspect | Old | New |
|---|---|---|
| Env var name | `NETLIFY_EMAILS_SECRET` | `POSTMARK_SERVER_TOKEN` |
| Fetch URL | `/.netlify/functions/emails/*` pattern | `https://api.postmarkapp.com/email` |
| Auth header | `netlify-emails-secret` | `X-Postmark-Server-Token` |
| Body shape | `{from, to, subject, parameters}` | `{From, To, Subject, HtmlBody}` |
| Body assertions | Check `parameters` object fields | Check `HtmlBody` string with `toContain()` |

## No Changes Needed

- **All callers** of `sendNotificationEmail()` — signature `(templateName, to, subject, parameters)` is preserved
- **`sendEmailsWithRetry()`** — calls `sendNotificationEmail()`, works unchanged
- **Dev email preview tool** — imports template modules directly, doesn't use `sendNotificationEmail()`
- **`setRequestOrigin()`** — unrelated to email transport

## Risk / Rollback

- If Postmark is down, emails fail with retry (existing `sendEmailsWithRetry` handles transient failures)
- Rollback: revert the `sendNotificationEmail()` change and restore `netlify.toml` plugin config
- Sandbox token in staging means no accidental real emails during testing
