# UX Polish Bundle — Design Spec

**Date:** 2026-03-15
**Scope:** 8 independent UX fixes and improvements

---

## 1. Recipient Search — Names First, Date Secondary

### Problem
After looking up a recipient, the result text reads "As of Fri Mar 13 2026, you're buying a gift for" with the recipient name awkwardly on a separate line, bold and right-aligned. The text says "you're" with no indication of who the giver is.

### Design

**Backend** (`api-recipient-get.mjs`): Return `giverName` in the response alongside `recipient`, `date`, and `wishlistViewUrl`. The endpoint already looks up the user by email — include the matched user's name.

**Frontend** (`RecipientSearch.js`): Update `recipientSearchResult()` to accept and display `giverName`. New layout:

```
<giver-name> is buying a gift for <recipient>!
As of Fri Mar 13 2026
```

- Both names bold and white
- Date on its own line, smaller and de-emphasized (lighter color, smaller font)
- All text centered, inline flow (no flexbox splitting the name to a separate column)

**CSS** (`recipient-search.css`): Remove the `margin-left: 7px` on `span` that was forcing the name to separate. Add a small/muted style for the date line.

**Legacy fallback**: The `lookupFromLegacy()` path in `api-recipient-get.mjs` has no user record to pull a giver name from. When `giverName` is missing from the response, the frontend should fall back to the original "You're buying a gift for" phrasing (without giver name).

### Files Changed
- `netlify/functions/api-recipient-get.mjs` — add `giverName` to response
- `src/exchange/components/RecipientSearch.js` — update template + `renderResult()`, handle missing `giverName`
- `public/css/components/recipient-search.css` — adjust span/date styles (keep bold/white on names, remove `margin-left`)
- `spec/exchange/components/RecipientSearch.spec.js` — update tests (with and without `giverName`)
- `spec/netlify-functions/api-recipient-get.spec.js` — test `giverName` in response
- `spec/integration/api-recipient-get.contract.spec.js` — update contract test for new response shape

---

## 2. "Group" → "House" Terminology

### Problem
The UI uses "group" and "exclusion group" terminology, which is abstract. The feature is designed around households — people who live together shouldn't be matched.

### Design

Seven text changes across five files:

| File | Current | New |
|------|---------|-----|
| `src/reuse.js` | `"Groups:"` | `"Households:"` |
| `src/exchange/state.js` | `` `Group ${displayNumber}` `` | `` `House ${displayNumber}` `` |
| `src/exchange/components/GhostHouse.js` (initial template) | "Want to prevent certain people from being matched? Create an exclusion group and drag their names in — or use the dropdown." | "Need to make sure people from the same household (like a husband and a wife) don't get matched with each other? Create a House and drag their names in — or use the dropdown. You can even name the House (e.g. \"The Smiths\")." |
| `src/exchange/components/GhostHouse.js` (initial button) | `"+ Add Group"` | `"+ Add House"` |
| `src/exchange/components/GhostHouse.js` (minimal template) | `"+ Add another group"` | `"+ Add another House"` |
| `src/exchange/components/Instructions.js` (step 2) | `"Sort people into exclusion groups (optional)"` | `"Separate people who live together into Houses (optional)"` |
| `src/exchange/components/House.js` (delete button) | `"Delete Group"` | `"Delete House"` |

### Files Changed
- `src/reuse.js`
- `src/exchange/state.js`
- `src/exchange/components/GhostHouse.js`
- `src/exchange/components/Instructions.js`
- `src/exchange/components/House.js`
- `spec/exchange/state.spec.js` — "Group 1", "Group 2" assertions
- `spec/exchange/index.spec.js` — "Group 1" assertion
- `spec/exchange/components/Instructions.spec.js` — "Group 1" assertion
- `spec/exchange/components/GhostHouse.spec.js` — "Add Group", "Group 1" assertions

---

## 3. Ghost House on Reuse

### Problem
When reusing a previous exchange, the ghost house never appears. The `EXCHANGE_STARTED` handler sets `rendered = true` without actually rendering, which suppresses the ghost house entirely.

### Design

In `GhostHouse.js`, update the `EXCHANGE_STARTED` handler for the `isReuse` case:

- **Reused exchange has 0 houses**: Render the initial template (full household instructions). This requires knowing the house count, which comes from subsequent `HOUSE_ADDED` events. Since `loadExchange()` calls `startExchange()` before adding houses, the ghost house should render the initial template on `EXCHANGE_STARTED` when `isReuse` is true.
- **Reused exchange has 1+ houses**: The `HOUSE_ADDED` events fire after `EXCHANGE_STARTED`, which will transition the ghost house from initial to minimal template automatically (existing behavior once the ghost house is actually rendered).

Implementation: When `isReuse` is true in the `EXCHANGE_STARTED` handler, call `render()` with the initial template instead of just setting `rendered = true`. The existing `HOUSE_ADDED` listener will then transition to minimal as houses load in.

### Files Changed
- `src/exchange/components/GhostHouse.js` — update `EXCHANGE_STARTED` handler
- `spec/exchange/components/GhostHouse.spec.js` — test reuse renders ghost house

---

## 4. Drag and Drop — Hide Source During Drag

### Problem
When beginning a drag, the original name remains visible in the source container and a dropzone appears next to it, causing the container to grow awkwardly.

### Design

On `dragstart`: Add a CSS class `dragging-source` to the dragged element. Apply the class inside a `requestAnimationFrame` callback to ensure the browser has captured the ghost image first (some browsers capture after microtask processing). This class sets `display: none`, collapsing the element so the container doesn't grow.

On `dragend`: Remove the `dragging-source` class to restore the element (in case the drop is cancelled or lands back in the same container).

**Browser compat note**: If `requestAnimationFrame` timing still causes ghost image issues in any browser, fall back to `setTimeout(fn, 0)`. If both fail, use `visibility: hidden` instead (preserves layout space but hides visually — less ideal since the container won't collapse, but guaranteed to work).

**CSS addition** (in `reset.css` alongside existing drag styles):
```css
.dragging-source {
  display: none;
}
```

### Files Changed
- `src/exchange/dragDrop.js` — add/remove `dragging-source` class on dragstart/dragend
- `public/css/base/reset.css` — add `.dragging-source` rule
- `spec/exchange/dragDrop.spec.js` — test source element is hidden during drag

---

## 5. Email Retry Flow — One Retry Max

### Problem
After email failures, users can retry indefinitely. After two failures, users should be given the option to view results and notify participants manually.

### Design

Track retry count in `FailedEmails.js` module state.

**First failure** — Show failed email list with two buttons:
- **"Retry"** — Retries the failed emails via `api-giver-notify-post`
- **"← Back"** — Returns to the email table, pre-populated with only the failed recipients so the user can correct email addresses before trying again

**Second failure** — Replace retry UI with:
- Apology message: "We're sorry, we were unable to send emails to the following addresses. Would you like to view the results and notify your participants yourself?"
- **"View Results"** button — Shows the results table (same behavior as current results display)
- No more retry option

The "← Back" button is styled like other buttons but with a left arrow character to the left of the text.

**Back button implementation**: The "← Back" button needs to re-render the email table with only the failed recipients. `EmailTable.js`'s `render()` function currently takes the full state from the event payload. To support partial re-rendering:
- `FailedEmails.js` passes the list of failed emails back to `EmailTable.js` via an exported `renderWithSubset(failedEmails)` function
- `renderWithSubset` filters `state.participants` (cached from the last event payload) to only those whose emails are in the failed list, then calls the existing `render()` logic with the filtered list
- When the user resubmits from this filtered email table, only the filtered participants and their corresponding assignments are sent to `api-giver-notify-post`

**View Results implementation**: The "View Results" button emits `Events.EMAIL_RESULTS_REQUESTED` (or equivalent) which `ResultsTable.js` already listens for. This reuses the existing results display mechanism rather than duplicating rendering logic.

### Files Changed
- `src/exchange/components/EmailTable/FailedEmails.js` — track retry count, add back button, add final failure state
- `src/exchange/components/EmailTable/EmailTable.js` — export `renderWithSubset(failedEmails)` function
- `public/css/components/email-dialog.css` or `email-confirmation.css` — back button styling if needed
- `spec/exchange/components/EmailTable/FailedEmails.spec.js`
- `spec/exchange/components/EmailTable/EmailTable.spec.js`

---

## 6. Back Button from "Send Me the Results"

### Problem
Once the user enters the "Send Me the Results" view, there's no way to return to the email table.

### Design

Add a styled **"← Back"** button to the SendResults component (both the confirmation screen and the form screen). Clicking it removes the SendResults UI and re-renders the email table.

Same button styling as other buttons, with a left arrow character to the left of the text.

**Implementation**: The back button handler calls `EmailTable.js`'s `render()` to re-display the email table. Since `SendResults.js` already imports from `EmailTable.js` (or can), and `render()` uses cached state from the last event payload, no additional state threading is needed — just export `render()` from `EmailTable.js`.

### Files Changed
- `src/exchange/components/EmailTable/SendResults.js` — add back button to templates + click handler
- `src/exchange/components/EmailTable/EmailTable.js` — export `render()` for back-navigation
- `spec/exchange/components/EmailTable/SendResults.spec.js`

---

## 7. Mobile CSS Fixes

### Problem
- In Secret Santa mode, houses and participants use a fixed 333px card width that leaves dead space or overflows on smaller screens.
- The `.sendEmails` component (Send Me Results + confirmation) has `max-width: 400px` with no mobile breakpoint, causing it to be scrunched on phones.

### Design

**SS mode at 723px breakpoint**: Override the flex-wrap card grid. Cards switch to stacked single-column layout matching normal mode — `width: 100%` (respecting container padding), no fixed 333px width.

```css
@media screen and (max-width: 723px) {
  #left-container.secret #name-list,
  #left-container.secret .household,
  #left-container.secret .ghost-house {
    width: 100%;
    max-width: 347px;
    margin: 0 auto 12px;
  }
}
```

**`.sendEmails` at 429px breakpoint**: Add to the existing `@media screen and (max-width: 429px)` block in `responsive.css` (alongside the existing `#emailTable` rule):

```css
/* Inside existing 429px block */
.sendEmails {
  min-width: 95%;
  margin: 0 5px;
}
```

**Breakpoint interaction note**: The 723px SS breakpoint sets `max-width: 347px`. The existing 630px breakpoint sets `max-width: 320px`. Since the 630px rules come later in the cascade (lower in `responsive.css`), they naturally override the 723px values at smaller screens. Verify this during implementation.

### Files Changed
- `public/css/responsive.css` — add 723px SS breakpoint; add `.sendEmails` to existing 429px block
- `public/css/themes/secret-santa.css` — may need adjustments for the 723px override

---

## 8. Deploy Preview Email Fix

### Problem
`sendNotificationEmail` uses `process.env.URL` to construct the email function URL. On deploy previews, `URL` points to production where the new email templates/functions may not exist, causing 502 errors.

### Design

One-line change in `sendNotificationEmail`:

```js
const baseUrl = process.env.DEPLOY_PRIME_URL || process.env.URL;
```

`DEPLOY_PRIME_URL` is automatically set by Netlify on deploy previews and branch deploys to the preview-specific URL. On production deploys, it's the same as `URL`. This ensures the email function call targets the correct deploy.

### Files Changed
- `netlify/shared/giverNotification.mjs` — use `DEPLOY_PRIME_URL` fallback
- `spec/netlify-functions/giverNotification.spec.js` — test both env var scenarios
