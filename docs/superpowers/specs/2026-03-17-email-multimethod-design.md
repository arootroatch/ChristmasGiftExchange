# Email Multimethod Dispatch Design

## Problem

The email sending layer in `giverNotification.mjs` uses inline `if (process.env.CONTEXT === "dev")` checks scattered through `sendNotificationEmail` and `sendBatchNotificationEmails`. This violates Open/Closed — adding a new email provider requires modifying existing functions. The dev implementation always returns success, making it impossible to test failed-email flows locally. Additionally, the Verifalia email verification widget loads in dev mode, blocking `@fail.test` addresses from submission.

## Design

### 1. Multimethod Module

**New file: `netlify/shared/multimethod.mjs`**

A lightweight Clojure-style multimethod implementation:

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

- `defmulti(dispatchFn)` returns a callable that dispatches to registered implementations
- `.defmethod(value, fn)` registers an implementation for a dispatch value
- Throws on unmatched dispatch value (no silent failures)
- No default method — forces explicit registration for each environment

### 2. Email Provider Dispatch

**Refactor `giverNotification.mjs`:**

Replace the two exported email functions with multimethods that dispatch on `() => process.env.CONTEXT`. The dispatch function normalizes non-dev contexts to `"production"` so deploy-preview, branch-deploy, and production all use the Postmark provider:

```js
import {defmulti} from "./multimethod.mjs";

const byContext = () => process.env.CONTEXT === "dev" ? "dev" : "production";

export const sendNotificationEmail = defmulti(byContext);
export const sendBatchNotificationEmails = defmulti(byContext);
```

**Remaining in `giverNotification.mjs`:**
- `sendBatchEmails(participants, assignments, userByEmail, exchangeId)` — unchanged orchestration layer that calls `sendBatchNotificationEmails`
- `forEachGiverOf(recipientUser, callback)` — unchanged
- `setRequestOrigin(event)` and `_requestOrigin` — unchanged, stays here since it's exported for `middleware.mjs`

**New file: `netlify/shared/emailProviders/dev.mjs`**

Imports multimethods from `giverNotification.mjs` and registers `"dev"` implementations.

**Circular dependency note:** `giverNotification.mjs` imports `dev.mjs`, which imports multimethods back from `giverNotification.mjs`. This is safe because ESM evaluates `export const sendNotificationEmail = defmulti(byContext)` synchronously before resolving the `dev.mjs` import. By the time `dev.mjs` accesses `sendNotificationEmail.defmethod`, the multimethod is already initialized.

`sendBatchNotificationEmails` dev implementation:

```js
sendBatchNotificationEmails.defmethod("dev", async (messages) => {
  const emailsFailed = [];
  for (const m of messages) {
    console.log(`[DEV EMAIL] Template: ${m.templateName} | To: ${m.to} | Subject: ${m.subject}`);
    console.log("[DEV EMAIL] Parameters:", JSON.stringify(m.parameters, null, 2));
    if (m.to.endsWith("@fail.test")) emailsFailed.push(m.to);
  }
  return {emailsFailed};
});
```

`sendNotificationEmail` dev implementation:

```js
sendNotificationEmail.defmethod("dev", async (templateName, to, subject, parameters) => {
  console.log(`[DEV EMAIL] Template: ${templateName} | To: ${to} | Subject: ${subject}`);
  console.log("[DEV EMAIL] Parameters:", JSON.stringify(parameters, null, 2));
  if (to.endsWith("@fail.test")) {
    throw new Error(`[DEV] Simulated email failure for ${to}`);
  }
});
```

**Throw behavior for `@fail.test`:** All callers of `sendNotificationEmail` already handle errors:
- `middleware.mjs` `apiHandler`: wraps in try/catch with empty `catch {}` (error-alert emails)
- `api-user-wishlist-put.mjs`: calls inside try/catch
- `api-user-contact-post.mjs`: calls inside try/catch
- `api-wishlist-email-post.mjs`: calls inside try/catch
- `api-results-email-post.mjs`: calls inside try/catch

So the new throw for `@fail.test` is caught by existing error handling in all cases.

**New file: `netlify/shared/emailProviders/postmark.mjs`**

Registers `"production"` implementations — the current Postmark code extracted as-is:
- Template registry (`templateModules` map with lazy imports)
- `sendNotificationEmail`: loads template, renders HTML, POSTs to `https://api.postmarkapp.com/email`
- `sendBatchNotificationEmails`: loads templates in parallel, POSTs to `https://api.postmarkapp.com/email/batch`, filters `emailsFailed` by ErrorCode

**Registration:** `giverNotification.mjs` imports both provider files at the top level so their `defmethod` calls execute on module load:

```js
import "./emailProviders/dev.mjs";
import "./emailProviders/postmark.mjs";
```

### 3. Preserved Exports

`giverNotification.mjs` continues to export the same public API:
- `sendNotificationEmail(templateName, to, subject, parameters)`
- `sendBatchNotificationEmails(messages)`
- `sendBatchEmails(participants, assignments, userByEmail, exchangeId)` — unchanged, calls `sendBatchNotificationEmails`
- `forEachGiverOf(recipientUser, callback)` — unchanged
- `setRequestOrigin(event)` — unchanged

All callers require zero changes:
- `middleware.mjs` — imports `sendNotificationEmail`, `setRequestOrigin`
- `api-exchange-post.mjs` — imports `sendBatchEmails`
- `api-giver-retry-post.mjs` — imports `sendBatchEmails`, `sendNotificationEmail`
- `api-user-wishlist-put.mjs` — imports `sendNotificationEmail`, `forEachGiverOf`
- `api-user-contact-post.mjs` — imports `sendNotificationEmail`, `forEachGiverOf`
- `api-wishlist-email-post.mjs` — imports `sendNotificationEmail`
- `api-results-email-post.mjs` — imports `sendNotificationEmail`

### 4. Vite Plugin: Strip Verifalia in Dev

**Modify `vitePageRoutes.js`:**

Add a `transformIndexHtml` hook that runs only during `serve` (dev) mode. Removes the Verifalia script tag and its attribution div from `index.html` so `@fail.test` addresses aren't blocked by client-side verification.

The plugin needs to track whether it's in serve mode. Set a flag in `configureServer` (which only runs during dev), then check it in `transformIndexHtml`:

```js
configureServer(server) {
  isServing = true;
  // ... existing middleware code
},

transformIndexHtml(html) {
  if (!isServing) return html;
  return html
    .replace(/<div[^>]*>Powered by Verifalia[^<]*<[^>]*>[^<]*<\/a><\/div>/, '')
    .replace(/<script[^>]*verifalia-widget[^>]*><\/script>/, '');
},
```

Only active during `vite serve` — production builds are untouched. This is bundled with the existing page routes plugin since it's a small concern related to HTML serving in dev mode.

### 5. File Structure

```
netlify/shared/
  multimethod.mjs              # defmulti/defmethod
  giverNotification.mjs        # multimethods + sendBatchEmails + forEachGiverOf + setRequestOrigin
  emailProviders/
    dev.mjs                    # "dev" implementations (logging + @fail.test)
    postmark.mjs               # "production" implementations (Postmark API + template registry)
```

### 6. `@fail.test` Convention

- `.test` is an IANA-reserved TLD — can never be a real email address
- Any email ending with `@fail.test` (e.g., `alex@fail.test`) triggers simulated failure in dev mode
- Works naturally with the retry flow: enter `alex@fail.test`, see failure UI, edit to `alex@whatever.com`, retry succeeds

## Testing

### `multimethod.spec.js`
- Dispatches to correct method based on dispatch function return value
- Throws when no method registered for dispatch value
- Multiple multimethods with same dispatch function are independent

### `emailProviders/dev.spec.js`
- `sendBatchNotificationEmails`: logs messages, returns `@fail.test` in `emailsFailed`, non-fail.test emails succeed
- `sendNotificationEmail`: logs template/to/subject/parameters, throws for `@fail.test`, succeeds for other addresses
- Mixed batch (some `@fail.test`, some not) returns only failed ones

### `emailProviders/postmark.spec.js`
- Existing `sendBatchNotificationEmails` and `sendNotificationEmail` tests, relocated from `giverNotification.spec.js`
- Same assertions: correct Postmark API calls, error handling, emailsFailed filtering
- `sendBatchEmails` tests also move here since they exercise the full stack through Postmark (mock `fetch`, set `CONTEXT=production`)

### `giverNotification.spec.js`
- `forEachGiverOf` tests remain unchanged (MongoDB-backed, unrelated to email dispatch)

### `vitePageRoutes.spec.js`
- New test: `transformIndexHtml` strips Verifalia script and attribution in serve mode
- New test: `transformIndexHtml` preserves Verifalia in build mode (non-serve)
- Existing tests unchanged
