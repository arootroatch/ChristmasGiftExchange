# Unique Email Validation & Send Me the Results

## Problem

When multiple participants share the same email address, `api-exchange-post` upserts them all to the same MongoDB user document. This causes downstream issues: `forEachGiverOf` finds multiple assignments pointing to the same `_id`, resulting in duplicate notification emails.

Additionally, some users don't have everyone's email addresses but still want to receive the full results.

## Feature 1: Unique Email Validation

### Frontend — EmailTable.js

On form submit (`submitEmails`), before the API call:

1. Collect all email input values
2. Check for duplicates (case-insensitive comparison)
3. If duplicates found:
   - Add `duplicate-email` CSS class to all inputs sharing a duplicated email (red border)
   - Show snackbar error: "Each participant must have a unique email address"
   - Prevent form submission (return early, don't call API)
4. Each `.emailInput` gets an `input` event listener that removes `duplicate-email` from that field only — no re-validation until the next submit attempt

### Backend — api-exchange-post.mjs

Add a `.check()` refinement to `exchangePostRequestSchema`:

```js
.check(ctx => {
    const emails = ctx.value.participants.map(p => p.email.toLowerCase());
    const seen = new Set();
    for (const email of emails) {
        if (seen.has(email)) {
            ctx.issues.push({
                code: "custom",
                message: "All participant emails must be unique",
                path: ["participants"],
            });
            return;
        }
        seen.add(email);
    }
})
```

This is a second `.check()` on the same schema, chained after the existing assignment name validation.

### CSS

```css
.emailInput.duplicate-email {
    border-color: red;
}
```

## Feature 2: Send Me the Results

### UI Placement & DOM Structure

SendResults renders as a **sibling** to `#emailTable`, appended to `body` independently (same pattern as EmailTable and SendEmails). This avoids being removed when EmailTable hides itself on `EMAILS_ADDED`.

Visual layout when both are visible:

```
#emailTable (EmailTable component)
  [Email inputs for each participant]
  [Submit Emails button]

#sendResults (SendResults component — separate DOM element)
  "Don't want to send out emails to everyone?"
  [Send Me the Results]
```

### New Component: SendResults.js

Location: `src/exchange/components/EmailTable/SendResults.js`

Subscribes to the same events as EmailTable:
- `RECIPIENTS_ASSIGNED` — caches participants, assignments, isSecretSanta; renders if secret santa
- `NEXT_STEP` — caches participants, assignments, isSecretSanta; renders if step 4
- `EXCHANGE_STARTED` — removes component
- `EMAILS_ADDED` — removes component (user chose the normal email flow)

Initialized in `src/exchange/index.js` alongside other EmailTable components. Order doesn't matter since it renders to `body` independently.

**Collapsed state:** Text prompt + "Send Me the Results" button.

**Expanded state (after clicking "Send Me the Results"):**
- In secret santa mode only: the full results table (giver -> recipient for all assignments) using the same row markup pattern as ResultsTable.js
- `<select>` dropdown populated with participant names (from cached participants)
- Email `<input type="email">` field (required)
- **Send** button

Clicking "Send Me the Results" toggles the expanded form (show/hide).

**Send button behavior:**
1. Disables button, shows "Sending..." (same `setLoadingState` pattern)
2. Calls `api-results-email-post` with `{ name, email, assignments }`
3. On success: show success snackbar "Results sent!", remove the SendResults component
4. On error: show error snackbar, re-enable button for retry
5. Does NOT emit `EMAILS_ADDED` — this is a separate flow from the normal email path

**Animation:** Uses the same `show`/`hide` CSS class pattern as SendEmails.js.

### Backend — New Endpoint: api-results-email-post.mjs

**Method:** POST

**Request schema:**
```js
const resultsEmailRequestSchema = z.object({
    name: z.string(),
    email: z.email(),
    assignments: z.array(z.object({
        giver: z.string(),
        recipient: z.string(),
    })).min(1),
});
```

No validation that `name` matches a giver in assignments — the name is just for personalizing the email greeting.

**Handler:** Sends email using `sendNotificationEmail` with template `results-summary`, passing name, email, and assignments as template parameters.

No authentication required — this is called from the exchange page before any user documents exist.

### Email Template — results-summary

Location: `emails/results-summary/index.html`

Netlify email template (Handlebars syntax) with:
- Subject: "Your Gift Exchange Results"
- Body structure:
  - Greeting: "Hi {{name}}, here are your gift exchange results:"
  - HTML `<table>` with inline styles (email-safe), one row per assignment:
    - Column 1: `{{giver}}`
    - Column 2: arrow
    - Column 3: `{{recipient}}`
  - Inline styles: border-collapse, padding, font-family (system fonts), readable font size

## What Stays the Same

- Non-secret-santa flow unchanged (results visible on screen, dismiss button on EmailTable)
- Secret santa email flow still works for users who have everyone's emails
- SendEmails.js unchanged — it handles the post-email-submission notification flow
- "Send Me the Results" is an alternative path, not a replacement

## Files to Create

- `src/exchange/components/EmailTable/SendResults.js`
- `netlify/functions/api-results-email-post.mjs`
- `emails/results-summary/index.html`

## Files to Modify

- `src/exchange/components/EmailTable/EmailTable.js` — duplicate email validation + input listeners
- `src/exchange/index.js` — import and init SendResults
- `netlify/functions/api-exchange-post.mjs` — add unique email `.check()`
- CSS file — `.duplicate-email` style

## Test Files to Create

- `spec/exchange/components/EmailTable/SendResults.spec.js`
- `spec/netlify-functions/api-results-email-post.spec.js`

## Test Files to Modify

- `spec/exchange/components/EmailTable/EmailTable.spec.js` — duplicate email validation tests
- `spec/netlify-functions/api-exchange-post.spec.js` — unique email validation tests
- `spec/integration/api-exchange-post.contract.spec.js` — contract test for duplicate email rejection
