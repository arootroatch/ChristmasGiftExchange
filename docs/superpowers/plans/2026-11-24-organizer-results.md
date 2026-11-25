# Organizer Results View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let organizers see who drew whom in exchanges they organized, from a new dashboard section, so they can give tech support.

**Architecture:** `api-my-exchanges-get` adds `isOrganizer` and `results` to exchanges the user organized. A shared memoized loader feeds both the existing Reuse section and a new `OrganizedSection`, which renders result cards with click-to-reveal blur on spoiler rows.

**Tech Stack:** Netlify functions + MongoDB, vanilla JS, CSS modules, Vitest (MongoMemoryServer backend, jsdom frontend).

**Spec:** `docs/superpowers/specs/2026-11-24-organizer-results-design.md`

## Global Constraints
- No new endpoint. Existing response fields (`participants`, `participantNames`, `houses`, `isLinkMode`, etc.) are unchanged.
- `results` is only ever present on exchanges where the requesting user is the organizer.
- All user-supplied strings are escaped with `escape`/`escapeAttr` from `src/utils.js`.
- Blur is CSS `filter: blur(...)` plus a real `<button>` to reveal (keyboard accessible).
- Follow the CLAUDE.md TDD workflow: one test at a time, with the vitest autorunner (`npx vitest --watch`) running in the background.

## Review Focus
- An assignment that references a user missing from `users` must not crash. Names render as `"Unknown"` (Task 1 test `uses Unknown for missing users`).
- Legacy exchanges with no `organizer` field must not get `results` (Task 1 test `omits results when exchange has no organizer`).
- The link-mode organizer name match ignores case and surrounding whitespace (Task 1 test `matches organizer name case-insensitively`).
- Regular non-Secret-Santa exchanges never blur, even on the organizer's row (Task 3 test `does not blur non-secret-santa exchanges`).
- Names containing HTML render as text (Task 3 test `escapes names and emails`).

---

### Task 1: Organizer results in `api-my-exchanges-get`

**Files:**
- Modify: `netlify/functions/api-my-exchanges-get.mjs`
- Test: `spec/netlify-functions/api-my-exchanges-get.spec.js`

**Interfaces:**
- Produces (response shape additions):
  - **Regular exchange organized by the user:**
    - `isOrganizer: true`
    - `results: [{giverName, giverEmail, recipientName, recipientIsYou}]`, in `assignments` order.
    - `recipientIsYou` is `assignment.recipientId.equals(user._id)`.
  - **Regular exchange not organized by the user** (including no `organizer` field): `isOrganizer: false` and no `results` key.
  - **Link exchange** (all returned link exchanges are organized by the user):
    - `isOrganizer: true`
    - `organizerMatched: boolean`
    - `results: [{giverName, hasDrawn, recipientName, recipientIsYou}]`, in `participants` order.
    - `recipientName` is `p.recipient` if `p.hasDrawn`, else `null`.
    - The organizer's participant is the one whose `name.trim().toLowerCase() === user.name.trim().toLowerCase()`. `organizerMatched` is whether one exists.
    - `recipientIsYou` is `p.hasDrawn && organizerMatched && p.recipient === <matched participant name>`.
  - Missing users resolve to name `"Unknown"` and email `""`.

- [ ] **Step 1: Write the failing tests one at a time.**
  - Seed the user, exchanges and link exchanges with the helpers from `spec/shared/testData.js` (`makeExchange` takes `organizer`; `makeLinkExchange` and `seedLinkExchange` exist).
  - Authenticate with `authCookie(userId)`.
  - Tests:
    - `includes results for exchanges the user organized`: alex organizes a 3-person Secret Santa (alex→whitney, whitney→hunter, hunter→alex). Expect `isOrganizer: true` and `results` to equal the three rows with names and emails, with `recipientIsYou` true only on `hunter→alex`.
    - `omits results for exchanges the user only participates in`: whitney organizes; alex requests. Expect `isOrganizer: false` and `results` undefined.
    - `omits results when exchange has no organizer`: delete `organizer` from the seeded doc. Expect no `results`.
    - `uses Unknown for missing users`: an assignment references a fresh `ObjectId` not in `users`. Expect that row to have `"Unknown"` and `""`.
    - `link exchange: hides recipients of participants who have not drawn`: Expect `recipientName: null` and `hasDrawn: false`.
    - `link exchange: flags the row whose recipient is the organizer`: the user's name is `"Alex"`, and a participant `"Alex"` exists whom `"Whitney"` drew (with `hasDrawn: true`). Expect `organizerMatched: true` and `recipientIsYou` true only on Whitney's row.
    - `matches organizer name case-insensitively`: the user's name is `"Alex"`; the participant is `" alex "`. Expect `organizerMatched: true`.
    - `link exchange: organizerMatched false when no participant matches`: Expect every `recipientIsYou` false.
  - The existing test `returns exchanges WITHOUT assignments for authenticated user` must still pass. Keep the raw `assignments` out of the response.

- [ ] **Step 2: Run `npx vitest run --project backend spec/netlify-functions/api-my-exchanges-get.spec.js` and confirm each new test fails on its assertion.**

- [ ] **Step 3: Implement it.**
  - In `enrichExchange(exchange, usersCol, user)`, build the id→user map once (already done for names). When `exchange.organizer?.equals(user._id)`, add the fields; otherwise set `isOrganizer: false`.
  - In `enrichLinkExchange(exchange, user)`, add the link fields.
  - Pass `event.user` through from the handler.

- [ ] **Step 4: Re-run the command. Expected: all api-my-exchanges-get tests PASS.**

- [ ] **Step 5: Commit**
```bash
git add netlify/functions/api-my-exchanges-get.mjs spec/netlify-functions/api-my-exchanges-get.spec.js
git commit -m "feat: include who-drew-whom results for organizers in my-exchanges"
```

### Task 2: Shared memoized my-exchanges loader

**Files:**
- Create: `src/dashboard/myExchanges.js`
- Modify: `src/dashboard/components/ReuseSection.js`, replacing its direct `apiFetch` of `api-my-exchanges-get` with `loadMyExchanges()`.
- Test: `spec/dashboard/myExchanges.spec.js`. Also modify `spec/dashboard/components/ReuseSection.spec.js` to call `_resetMyExchanges()` in `beforeEach`/setup.

**Interfaces:**
- Produces:
  - `export function loadMyExchanges(): Promise<Array>`. It fetches `GET /.netlify/functions/api-my-exchanges-get` once per page load and returns the same promise on later calls. It rejects with an `Error` whose `message` is the server error message, or `'Failed to load exchanges. Please try again.'`. A rejected load is not cached, so a later call retries.
  - `export function _resetMyExchanges(): void` (tests only).
- ReuseSection keeps its current rendering, empty-state and error-state behavior and text.

- [ ] **Step 1: Write the failing tests.**
  - `myExchanges.spec.js`:
    - `fetches once and shares the result between callers`: two calls give one `fetch` call and the same data.
    - `retries after a failed load`: the first fetch is `ok: false`; the second call fetches again.
- [ ] **Step 2: Run `npx vitest run --project frontend-pages spec/dashboard` and confirm the new tests fail.**
- [ ] **Step 3: Implement `myExchanges.js`, switch ReuseSection to it, and add `_resetMyExchanges()` to the ReuseSection spec setup.**
- [ ] **Step 4: Re-run `npx vitest run --project frontend-pages spec/dashboard`. Expected: all PASS, including the unchanged ReuseSection tests.**
- [ ] **Step 5: Commit**
```bash
git add src/dashboard/myExchanges.js src/dashboard/components/ReuseSection.js spec/dashboard/myExchanges.spec.js spec/dashboard/components/ReuseSection.spec.js
git commit -m "refactor: share one my-exchanges request across dashboard sections"
```

### Task 3: OrganizedSection component and dashboard wiring

**Files:**
- Create: `src/dashboard/components/OrganizedSection.js`
- Create: `assets/styles/dashboard/components/organized.module.css`
- Modify: `src/dashboard/index.js`.
  - Add `'organized'` to `SECTIONS`, after `'recipient'`, with label `'Exchanges You Organized'`.
  - Call `organizedSection.init()` in `initDashboard()`.
- Test: `spec/dashboard/components/OrganizedSection.spec.js`. Update `spec/dashboard/index.spec.js` only if its nav-item count or label assertions change.

**Interfaces:**
- Consumes: `loadMyExchanges()` from Task 2, plus the Task 1 response fields.
- Produces: `export function init()`.
  - Immediately sets `hidden` on `.nav-item[data-section="organized"]` and shows a spinner in `#section-organized`.
  - When the data loads, it filters to `isOrganizer`.
    - **If there are none:** keep the nav hidden and render `<p class="empty-state">You haven't organized any exchanges yet.</p>`.
    - **If there are some:** un-hide the nav item and render one card per exchange (newest first, as returned).
  - On error, render the error message as an `empty-state` paragraph.
- **Card:**
  - Heading: `toLocaleDateString()` of `createdAt`, then the mode label: `'Secret Santa'` if `isSecretSanta && !isLinkMode`, `'Link draw'` if `isLinkMode`, else `'Gift exchange'`.
  - One row per result:
    - **Regular:** giver name, giver email, `→`, and `'You'` if `recipientIsYou` else the recipient name.
    - **Link:** giver name, `→`, and the recipient name, or `"hasn't drawn yet"` when `!hasDrawn`.
- **Blur:**
  - A blurred element gets the CSS module class `blurred`, plus a sibling `<button type="button" class="reveal-btn">Reveal</button>`. Clicking it removes `blurred` from that row's blurred elements and removes the button.
  - Blur the **giver name and email** when `recipientIsYou && (isSecretSanta || isLinkMode)`.
  - Blur the **recipient name** on every drawn row when `isLinkMode && organizerMatched === false`.
  - Nothing else is blurred.

- [ ] **Step 1: Write the failing tests one at a time.** Use the JSDOM setup pattern from `ReuseSection.spec.js`, with `<a class="nav-item" data-section="organized"></a><div id="section-organized"></div>`. Mock fetch to return fixtures, and call `_resetMyExchanges()` first.
  - `hides the nav item and shows empty state when nothing is organized`
  - `shows the nav item and one card per organized exchange`: non-organized exchanges are not rendered.
  - `renders giver, email and recipient for each row`
  - `blurs only the row where the organizer is the recipient in secret santa`: exactly one row has blurred elements, and its recipient shows `You`.
  - `reveal button unblurs that row`: after the click, there are no `.blurred` elements in the row and no reveal button.
  - `does not blur non-secret-santa exchanges`: `isSecretSanta: false` with `recipientIsYou: true` gives no blurred elements.
  - `link draw: shows hasn't drawn yet and blurs only the organizer row when matched`
  - `link draw: blurs every drawn recipient when organizerMatched is false`
  - `escapes names and emails`: a name `<b>x</b>` renders no `b` element.
  - `shows the error message when loading fails`
- [ ] **Step 2: Run `npx vitest run --project frontend-pages spec/dashboard` and confirm the new tests fail.**
- [ ] **Step 3: Implement `OrganizedSection.js`, the CSS module (card styling reusing the look of `cards.module.css`; `.blurred { filter: blur(5px); user-select: none; }`) and the `index.js` wiring.**
- [ ] **Step 4: Run the full suite with `npx vitest run`. Expected: all PASS.** Then run `npx eslint src spec netlify`, which should be clean.
- [ ] **Step 5: Commit**
```bash
git add src/dashboard/components/OrganizedSection.js assets/styles/dashboard/components/organized.module.css src/dashboard/index.js spec/dashboard/components/OrganizedSection.spec.js spec/dashboard/index.spec.js
git commit -m "feat: add organizer results section to dashboard"
```
