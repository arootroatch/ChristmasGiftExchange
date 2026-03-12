# Endpoint Consolidation & Renaming Design

## Goal

Rename two endpoints for clarity, consolidate the exchange creation and email notification flows into a single endpoint, and replace the SendEmails component with a retry-focused FailedEmails component.

## Motivation

- `api-exchange-get` is misleading — it returns a recipient's wishlist, not an exchange. Rename to `api-user-wishlist-get`.
- `api-exchange-search` doesn't indicate its HTTP method. Since `api-exchange-get` is being freed up, reuse that name.
- `api-exchange-post` and `api-giver-notify-post` are called sequentially by the frontend (save exchange, then send emails). This two-step process is unnecessary — saving and notifying can happen in one request, eliminating a serverless function cold start and simplifying the frontend flow.

## Changes

### 1. Rename api-exchange-get → api-user-wishlist-get

**Files affected:**
- `netlify/functions/api-exchange-get.mjs` → `netlify/functions/api-user-wishlist-get.mjs`
- `spec/netlify-functions/api-exchange-get.spec.js` → `spec/netlify-functions/api-user-wishlist-get.spec.js`
- `spec/integration/api-exchange-get.contract.spec.js` → `spec/integration/api-user-wishlist-get.contract.spec.js`
- Frontend: update URL in `src/wishlistView.js` (or wherever the endpoint is called)

No logic changes — pure rename of file and endpoint URL.

### 2. Rename api-exchange-search → api-exchange-get

**Files affected:**
- `netlify/functions/api-exchange-search.mjs` → `netlify/functions/api-exchange-get.mjs`
- `spec/netlify-functions/api-exchange-search.spec.js` → `spec/netlify-functions/api-exchange-get.spec.js`
- `spec/integration/api-exchange-search.contract.spec.js` → `spec/integration/api-exchange-get.contract.spec.js`
- Frontend: update URL in `src/reuse.js`

No logic changes — pure rename. Must happen after rename #1 to avoid collision.

### 3. Fix sendNotificationEmail error handling

`sendNotificationEmail` in `netlify/shared/giverNotification.mjs` currently calls `fetch()` but never checks the response status or throws on failure. A failed email silently appears to succeed. Update it to throw on non-OK responses so the retry mechanism can detect failures.

### 4. Consolidate api-exchange-post + email sending

**api-exchange-post.mjs changes:**

After the existing save logic (upsert users, insert exchange), the endpoint now also:
1. Uses the `userMap` already returned by `upsertParticipants()` to get tokens (it returns full user documents via `returnDocument: "after"` — no extra DB query needed)
2. Loops through assignments, calling `sendNotificationEmail("secret-santa", ...)` for each
3. Each email gets up to 3 attempts before being considered failed
4. Collects failed email addresses

Response shape changes from:
```json
{"exchangeId": "uuid", "participants": [{...}]}
```
to:
```json
{"exchangeId": "uuid", "participants": [{...}], "emailsFailed": ["failed@email.com"]}
```

`emailsFailed` is an empty array on full success.

**Schema cleanup:**

Extract the `.check()` refinements from `exchangePostRequestSchema` into well-named helper functions:
- `validateAssignmentNamesExist(ctx)` — checks that all assignment giver/recipient names exist in participants
- `validateUniqueEmails(ctx)` — checks that all participant emails are unique (case-insensitive)

### 5. Simplify api-giver-notify-post (retry-only endpoint)

This endpoint is retained but simplified to handle retrying failed emails only.

**Request shape (unchanged):**
```json
{
  "participants": [{"name": "...", "email": "..."}],
  "assignments": [{"giver": "...", "recipient": "..."}]
}
```

The frontend sends only the failed subset of participants/assignments. The existing schema already accepts any valid subset — no schema changes needed.

**Logic changes:**
- Sends emails with 3-attempt retry per email (same as exchange-post)
- On any remaining failures after retries: sends an error-alert email to the site admin (using existing `error-alert` email template with endpoint, timestamp, and failed addresses in the stackTrace field; sent to the hardcoded admin address in `sendNotificationEmail`)
- Response shape changes from `{sent, total}` to `{sent, total, emailsFailed}`

### 6. Delete SendEmails component

**Files deleted:**
- `src/exchange/components/EmailTable/SendEmails.js`
- `spec/exchange/components/EmailTable/SendEmails.spec.js`

**Other changes:**
- Remove `import * as sendEmails` and `sendEmails.init()` from `src/exchange/index.js`

### 7. Remove EMAILS_ADDED event

**state.js changes:**
- Remove `EMAILS_ADDED` from `ExchangeEvents`
- Remove `addEmailsToParticipants()` function

**EmailTable.js changes:**
- Remove `EMAILS_ADDED` event subscription
- `submitEmails` success handler calls `hideEmailTable()` directly instead of `addEmailsToParticipants()`
- Success handler checks `emailsFailed` from API response:
  - Empty: success snackbar "Exchange saved and emails sent!", hide EmailTable
  - Non-empty: hide EmailTable, render FailedEmails component

### 8. FailedEmails component

A persistent modal (`.sendEmails` class styling) shown when some notification emails fail to send.

**Rendering:**
- Rendered by EmailTable's `submitEmails` success handler when `emailsFailed` is non-empty
- `submitEmails` has access to participants and assignments via its existing closure; it filters them down to the failed subset and passes that data to the FailedEmails render function
- Shown on `body` with `.sendEmails` class (same frosted glass modal as SendEmails used)

**Content:**
- List of failed email addresses
- Message: "Your exchange data has been saved. You can retrieve it by entering a participant's email in the recipient search on the home page."
- Retry button

**Retry flow:**
- Retry button calls `api-giver-notify-post` with just the failed assignments/participants (passed via closure)
- On success (all sent): remove component, success snackbar
- On failure (any still failed): remove component, error snackbar apologizing. The backend sends an error-alert email to the admin.
- Only one retry allowed — no second retry button

**Cleanup:**
- Removed on `EXCHANGE_STARTED` (same pattern as other modal components)

**Location:**
- Lives in EmailTable.js alongside the existing send-results confirmation/form logic. It follows the same pattern: EmailTable renders it, no separate event subscriptions needed, data passed via function parameters.

### Test Updates

- `spec/integration/api-exchange-post.contract.spec.js` — update to verify `emailsFailed` in response
- `spec/netlify-functions/api-exchange-post.spec.js` — add tests for email sending, retry logic, and `emailsFailed` response
- `spec/netlify-functions/api-giver-notify-post.spec.js` — update for new `emailsFailed` response and error-alert email on failure
- `spec/integration/api-giver-notify-post.contract.spec.js` — update for `emailsFailed` response
- `spec/exchange/components/EmailTable/EmailTable.spec.js` — add tests for FailedEmails rendering, retry, and direct `hideEmailTable` call on success
- Delete `spec/exchange/components/EmailTable/SendEmails.spec.js`
- Rename tests per sections 1-2

## Retry Mechanism Detail

Shared retry helper used in both `api-exchange-post` and `api-giver-notify-post`:

```
for each assignment:
  for attempt = 1 to 3:
    try sendNotificationEmail(...)
    if success: break
    if attempt == 3: add to emailsFailed
```

No delay between retries. Netlify serverless functions have a 10-second timeout; delays would eat into that budget.

## Dev Mode Behavior

`sendNotificationEmail` returns immediately in non-production (console.log only). In dev mode, `emailsFailed` will always be empty since no actual email sending occurs. The error-alert email also won't send in dev — it uses the same `sendNotificationEmail` function.

## Data Flow Summary

### Happy path
```
User fills emails → Submit → api-exchange-post (save + send all) → all succeed
→ success snackbar → hide EmailTable
```

### Partial failure
```
User fills emails → Submit → api-exchange-post (save + send all) → some fail
→ hide EmailTable → show FailedEmails component (lists failures)
→ User clicks Retry → api-giver-notify-post (retry failed only)
→ all succeed → remove component → success snackbar
```

### Retry also fails
```
→ User clicks Retry → api-giver-notify-post (retry failed only)
→ still failing → backend sends error-alert email to admin
→ remove component → error snackbar apologizing
```
