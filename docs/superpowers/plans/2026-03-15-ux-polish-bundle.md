# UX Polish Bundle Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 8 independent UX issues: recipient search text, group→house terminology, ghost house on reuse, drag-drop source hiding, email retry limits, send-results back button, mobile CSS, and deploy preview email fix.

**Architecture:** Each task is independent and can be implemented in any order. All frontend changes follow the existing event-driven component pattern. Backend changes are minimal (one endpoint response field, one env var swap).

**Tech Stack:** Vanilla JS, Vitest + jsdom, Netlify serverless functions, MongoDB, CSS media queries.

**Spec:** `docs/superpowers/specs/2026-03-15-ux-polish-bundle-design.md`

---

## Chunk 1: Backend + Simple Text Changes (Tasks 1-3)

### Task 1: Deploy Preview Email Fix

**Files:**
- Modify: `netlify/shared/giverNotification.mjs:68-69`
- Test: `spec/netlify-functions/giverNotification.spec.js`

- [ ] **Step 1: Write failing test for DEPLOY_PRIME_URL preference**

In `spec/netlify-functions/giverNotification.spec.js`, add a new `describe` block for `sendNotificationEmail`. The existing file uses dynamic `import()` in `beforeAll` after setting env vars, and `vi.stubGlobal('fetch', vi.fn())` for mocking fetch. Follow the same pattern:

```js
describe("sendNotificationEmail", () => {
    let sendNotificationEmail;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret';
        vi.stubGlobal('fetch', vi.fn());
        const module = await import('../../netlify/shared/giverNotification.mjs');
        sendNotificationEmail = module.sendNotificationEmail;
    });

    beforeEach(() => {
        fetch.mockReset();
    });

    afterAll(() => {
        vi.unstubAllGlobals();
        delete process.env.CONTEXT;
        delete process.env.URL;
        delete process.env.NETLIFY_EMAILS_SECRET;
        delete process.env.DEPLOY_PRIME_URL;
    });

    it("uses DEPLOY_PRIME_URL over URL when available", async () => {
        process.env.DEPLOY_PRIME_URL = "https://deploy-preview-42--mysite.netlify.app";
        fetch.mockResolvedValue({ok: true});

        await sendNotificationEmail("test-template", "test@example.com", "Subject", {key: "value"});

        expect(fetch).toHaveBeenCalledWith(
            "https://deploy-preview-42--mysite.netlify.app/.netlify/functions/emails/test-template",
            expect.objectContaining({method: "POST"})
        );
    });

    it("falls back to URL when DEPLOY_PRIME_URL is not set", async () => {
        delete process.env.DEPLOY_PRIME_URL;
        fetch.mockResolvedValue({ok: true});

        await sendNotificationEmail("test-template", "test@example.com", "Subject", {key: "value"});

        expect(fetch).toHaveBeenCalledWith(
            "https://test.netlify.app/.netlify/functions/emails/test-template",
            expect.objectContaining({method: "POST"})
        );
    });
});
```

Note: `sendNotificationEmail` reads `process.env` at call time, not import time. Since the existing `sendEmailsWithRetry` describe block already does `process.env.URL = 'https://test.netlify.app'` in its `beforeAll`, and the module is cached after first import, the `sendNotificationEmail` function will read env vars fresh on each call. The `DEPLOY_PRIME_URL` is set/deleted per test.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/giverNotification.spec.js`
Expected: FAIL — tests call fetch with `process.env.URL` regardless of `DEPLOY_PRIME_URL`

- [ ] **Step 3: Implement the fix**

In `netlify/shared/giverNotification.mjs`, change line 68-69 from:

```js
    const response = await fetch(
        `${process.env.URL}/.netlify/functions/emails/${templateName}`,
```

To:

```js
    const baseUrl = process.env.DEPLOY_PRIME_URL || process.env.URL;
    const response = await fetch(
        `${baseUrl}/.netlify/functions/emails/${templateName}`,
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/giverNotification.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/giverNotification.mjs spec/netlify-functions/giverNotification.spec.js
git commit -m "fix: use DEPLOY_PRIME_URL for email function calls on deploy previews"
```

---

### Task 2: Recipient Search — Backend (giverName in response)

**Files:**
- Modify: `netlify/functions/api-recipient-get.mjs:31-40`
- Test: `spec/netlify-functions/api-recipient-get.spec.js`
- Test: `spec/integration/api-recipient-get.contract.spec.js`

- [ ] **Step 1: Write failing test for giverName in new collections response**

In `spec/netlify-functions/api-recipient-get.spec.js`, update the existing test "queries new collections and returns recipient with wishlist URL" (line 36) to also assert `giverName`:

```js
// Add after the last expect in the "queries new collections..." test (after line 84):
expect(body.giverName).toBe('Alex');
```

Also add the same assertion to "does not include wishlist URL when recipient has no wishlist" (after the last expect around line 130):

```js
expect(body.giverName).toBe('Alex');
```

And verify legacy responses do NOT include giverName — the existing "falls back to legacy collection" test should assert (after the last expect around line 151):

```js
expect(body.giverName).toBeUndefined();
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/api-recipient-get.spec.js`
Expected: FAIL — `body.giverName` is `undefined` for new collection tests

- [ ] **Step 3: Implement giverName in response**

In `netlify/functions/api-recipient-get.mjs`, in the `lookupFromNewCollections` function, the `user` variable (line 11) is the giver. Add `giverName` to the result object. Change lines 31-34 from:

```js
    const result = {
        recipient: recipient.name,
        date: latestExchange.createdAt,
    };
```

To:

```js
    const result = {
        giverName: user.name,
        recipient: recipient.name,
        date: latestExchange.createdAt,
    };
```

No changes needed for `lookupFromLegacy` — it has no user record, so `giverName` will naturally be absent.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/api-recipient-get.spec.js`
Expected: PASS

- [ ] **Step 5: Update contract test**

In `spec/integration/api-recipient-get.contract.spec.js`, find the test that asserts on the response body shape and add `giverName` to the expected fields. If the contract test uses the same fixture pattern as the unit test, add:

```js
expect(body.giverName).toBe('Alex');  // or whatever the giver name is in the fixture
```

- [ ] **Step 6: Run contract tests**

Run: `npx vitest run spec/integration/api-recipient-get.contract.spec.js`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add netlify/functions/api-recipient-get.mjs spec/netlify-functions/api-recipient-get.spec.js spec/integration/api-recipient-get.contract.spec.js
git commit -m "feat: include giverName in recipient search API response"
```

---

### Task 3: Recipient Search — Frontend (names first, date secondary)

**Files:**
- Modify: `src/exchange/components/RecipientSearch.js:31-37`
- Modify: `public/css/components/recipient-search.css:48-52`
- Test: `spec/exchange/components/RecipientSearch.spec.js:58-64`

- [ ] **Step 1: Update failing tests for new text format**

In `spec/exchange/components/RecipientSearch.spec.js`:

Update the "displays recipient and date" test (line 58) to expect the new format with giverName:

```js
it("displays giver name, recipient, and date", async () => {
    stubRecipientFetch({giverName: "Alex", recipient: "Whitney", date: "2023-06-15T12:00:00.000Z"});
    click("#recipientSearchBtn");
    await waitFor(() => {
        expect(query.innerHTML).toContain("Alex");
        expect(query.innerHTML).toContain("is buying a gift for");
        expect(query.innerHTML).toContain("Whitney!");
        expect(query.innerHTML).toContain("Thu Jun 15 2023");
    });
});
```

Add a new test for legacy fallback (no giverName):

```js
it("displays 'You're' when giverName is missing (legacy)", async () => {
    stubRecipientFetch({recipient: "Legacy Person", date: "2023-06-15T12:00:00.000Z"});
    click("#recipientSearchBtn");
    await waitFor(() => {
        expect(query.innerHTML).toContain("You're buying a gift for");
        expect(query.innerHTML).toContain("Legacy Person!");
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/components/RecipientSearch.spec.js`
Expected: FAIL — old template doesn't include giverName, still says "you're"

- [ ] **Step 3: Update recipientSearchResult and renderResult**

In `src/exchange/components/RecipientSearch.js`:

Change the `recipientSearchResult` function (lines 31-37) to:

```js
export function recipientSearchResult(date, giverName, recipient) {
  const who = giverName
    ? `<span>${escapeAttr(giverName)}</span> is`
    : `You're`;
  return `
    <div>
        <p>${who} buying a gift for <span>${escapeAttr(recipient)}!</span></p>
        <p class="date-secondary">${escapeAttr(date.toDateString())}</p>
    </div>
    ${recipientSearchInput}`;
}
```

Update `renderResult` (line 44) to pass `giverName`:

```js
let html = recipientSearchResult(date, results.giverName, results.recipient);
```

- [ ] **Step 4: Update CSS**

In `public/css/components/recipient-search.css`, change the `& span` rule (lines 48-52) from:

```css
  & span {
    color: #fff;
    font-weight: bold;
    margin-left: 7px;
  }
```

To:

```css
  & span {
    color: #fff;
    font-weight: bold;
  }
  & .date-secondary {
    color: rgba(255, 255, 255, 0.35);
    font-size: 0.85em;
    margin-top: 4px;
  }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/RecipientSearch.spec.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/exchange/components/RecipientSearch.js public/css/components/recipient-search.css spec/exchange/components/RecipientSearch.spec.js
git commit -m "feat: display giver name and de-emphasize date in recipient search results"
```

---

## Chunk 2: Terminology + Ghost House (Tasks 4-5)

### Task 4: "Group" → "House" Terminology

**Files:**
- Modify: `src/reuse.js:34`
- Modify: `src/exchange/state.js:62`
- Modify: `src/exchange/components/GhostHouse.js:25-27,34`
- Modify: `src/exchange/components/Instructions.js:15`
- Modify: `src/exchange/components/House.js:37`
- Test: `spec/exchange/state.spec.js`
- Test: `spec/exchange/index.spec.js`
- Test: `spec/exchange/components/Instructions.spec.js`
- Test: `spec/exchange/components/GhostHouse.spec.js`

- [ ] **Step 1: Update test assertions first**

Update all tests that assert on "Group" text to expect "House" text instead:

**`spec/exchange/state.spec.js`**: Change all `"Group 1"` → `"House 1"` and `"Group 2"` → `"House 2"` in assertions.

**`spec/exchange/index.spec.js`**: Change `"Group 1"` → `"House 1"` in assertions.

**`spec/exchange/components/Instructions.spec.js`**: Change the assertion that checks for "exclusion groups" to expect `"Separate people who live together into Houses (optional)"`.

**`spec/exchange/components/GhostHouse.spec.js`**: Change `"Add Group"` → `"Add House"` and `"another group"` → `"another House"` in assertions. Also update any assertion checking the initial ghost house instruction text.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/state.spec.js spec/exchange/index.spec.js spec/exchange/components/Instructions.spec.js spec/exchange/components/GhostHouse.spec.js`
Expected: FAIL — source still has "Group"/"group" text

- [ ] **Step 3: Update source files**

**`src/exchange/state.js:62`** — Change:
```js
state.houses.push({id: houseID, name: `Group ${displayNumber}`, members: []});
```
To:
```js
state.houses.push({id: houseID, name: `House ${displayNumber}`, members: []});
```

**`src/reuse.js:34`** — Change `Groups:` to `Households:`:
```js
${ex.houses.length > 0 ? `<p><strong>Households:</strong> ${ex.houses.map(h => `${escape(h.name)} (${escape(h.members.join(", "))})`).join("; ")}</p>` : ""}
```

**`src/exchange/components/GhostHouse.js`** — Update three places:

Line 25-27 (initialTemplate):
```js
function initialTemplate() {
  return `
    <div id="${ghostHouseId}" class="ghost-house">
      <p class="ghost-text">Need to make sure people from the same household (like a husband and a wife) don't get matched with each other?
      Create a House and drag their names in — or use the dropdown. You can even name the House (e.g. "The Smiths").</p>
      <button class="${btnClass}">+ Add House<br><span class="shortcut">(Shift+Enter)</span></button>
    </div>`;
}
```

Line 34 (minimalTemplate):
```js
<button class="${btnClass}">+ Add another House<br><span class="shortcut">(Shift+Enter)</span></button>
```

**`src/exchange/components/Instructions.js:15`** — Change:
```js
<li>Sort people into exclusion groups (optional)</li>
```
To:
```js
<li>Separate people who live together into Houses (optional)</li>
```

**`src/exchange/components/House.js:37`** — Change:
```js
<button class="button deleteHouse" id="${houseID}-delete">Delete Group</button>
```
To:
```js
<button class="button deleteHouse" id="${houseID}-delete">Delete House</button>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/state.spec.js spec/exchange/index.spec.js spec/exchange/components/Instructions.spec.js spec/exchange/components/GhostHouse.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/reuse.js src/exchange/state.js src/exchange/components/GhostHouse.js src/exchange/components/Instructions.js src/exchange/components/House.js spec/exchange/state.spec.js spec/exchange/index.spec.js spec/exchange/components/Instructions.spec.js spec/exchange/components/GhostHouse.spec.js
git commit -m "refactor: rename 'group' terminology to 'house/household' throughout UI"
```

---

### Task 5: Ghost House on Reuse

**Files:**
- Modify: `src/exchange/components/GhostHouse.js:63-71`
- Test: `spec/exchange/components/GhostHouse.spec.js`

- [ ] **Step 1: Write failing tests for ghost house on reuse**

In `spec/exchange/components/GhostHouse.spec.js`, add tests:

```js
describe("on reuse", () => {
    it("renders initial template when exchange is reused", () => {
        exchangeEvents.emit(ExchangeEvents.EXCHANGE_STARTED, {isReuse: true});
        const ghostHouse = document.querySelector("#ghost-house");
        expect(ghostHouse).not.toBeNull();
        expect(ghostHouse.textContent).toContain("household");
    });

    it("transitions to minimal when houses are added after reuse", () => {
        exchangeEvents.emit(ExchangeEvents.EXCHANGE_STARTED, {isReuse: true});
        exchangeEvents.emit(ExchangeEvents.HOUSE_ADDED, {houseID: "house-0"});
        const ghostHouse = document.querySelector("#ghost-house");
        expect(ghostHouse).not.toBeNull();
        expect(ghostHouse.textContent).toContain("another House");
    });
});
```

Note: Ensure the test setup includes `left-container` in the DOM and that GhostHouse `init()` has been called. Check existing GhostHouse tests for proper setup.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/components/GhostHouse.spec.js`
Expected: FAIL — ghost house is not rendered on reuse (just sets `rendered = true` without calling `render()`)

- [ ] **Step 3: Fix the EXCHANGE_STARTED handler**

In `src/exchange/components/GhostHouse.js`, change lines 63-71 from:

```js
  stateEvents.on(Events.EXCHANGE_STARTED, ({isReuse}) => {
    participantCount = 0;
    houseCount = 0;
    rendered = false;
    remove();
    if (isReuse) {
      rendered = true;
    }
  });
```

To:

```js
  stateEvents.on(Events.EXCHANGE_STARTED, ({isReuse}) => {
    participantCount = 0;
    houseCount = 0;
    rendered = false;
    remove();
    if (isReuse) {
      renderInitialOrMinimal();
    }
  });
```

This works because `renderInitialOrMinimal()` calls `render()` which sets `rendered = true`. At the time `EXCHANGE_STARTED` fires, `houseCount` is 0, so it renders the initial template. Then as `loadExchange()` emits `HOUSE_ADDED` events, the existing handler at line 84 increments `houseCount` and calls `renderInitialOrMinimal()` again (since `rendered` is now true), which switches to minimal template.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/GhostHouse.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/exchange/components/GhostHouse.js spec/exchange/components/GhostHouse.spec.js
git commit -m "fix: render ghost house when reusing an exchange"
```

---

## Chunk 3: Drag-Drop + Mobile CSS (Tasks 6-7)

### Task 6: Drag and Drop — Hide Source During Drag

**Files:**
- Modify: `src/exchange/dragDrop.js:110-114,131-134`
- Modify: `public/css/base/reset.css` (add after line 110)
- Test: `spec/exchange/dragDrop.spec.js`

- [ ] **Step 1: Write failing test for source hiding**

In `spec/exchange/dragDrop.spec.js`, add a test that verifies the source element gets the `dragging-source` class during drag. Check how existing drag tests set up the DOM and simulate drag events.

```js
it("hides the source element during drag", () => {
    // Trigger dragstart on a name-wrapper element
    const nameWrapper = document.querySelector(".name-wrapper");
    const dragStartEvent = new Event("dragstart", {bubbles: true});
    dragStartEvent.dataTransfer = {setData: vi.fn()};
    nameWrapper.dispatchEvent(dragStartEvent);

    // After rAF, element should have dragging-source class
    // Use vi.runAllTimers() or flush rAF manually
    expect(nameWrapper.classList.contains("dragging-source")).toBe(true);
});

it("restores the source element on dragend", () => {
    const nameWrapper = document.querySelector(".name-wrapper");
    nameWrapper.classList.add("dragging-source");

    const dragEndEvent = new Event("dragend", {bubbles: true});
    document.querySelector("#left-container").dispatchEvent(dragEndEvent);

    expect(nameWrapper.classList.contains("dragging-source")).toBe(false);
});
```

Note: The `requestAnimationFrame` approach means you may need to mock rAF or use `vi.useFakeTimers()` to test this. jsdom's rAF may execute synchronously or need manual flushing. Check how the existing test file handles timers.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/dragDrop.spec.js`
Expected: FAIL — no `dragging-source` class is added

- [ ] **Step 3: Add CSS class**

In `public/css/base/reset.css`, add after line 110 (after the `body.dragging` rule):

```css
.dragging-source {
  display: none;
}
```

- [ ] **Step 4: Add class toggle in dragStart/dragEnd**

In `src/exchange/dragDrop.js`, update the `dragstart` handler (lines 110-115) from:

```js
  container.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('name-wrapper')) {
      document.body.classList.add('dragging');
      drag(e);
    }
  });
```

To:

```js
  container.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('name-wrapper')) {
      document.body.classList.add('dragging');
      drag(e);
      requestAnimationFrame(() => {
        e.target.classList.add('dragging-source');
      });
    }
  });
```

Update the `dragend` handler (lines 131-134) from:

```js
  container.addEventListener('dragend', () => {
    stopAutoScroll();
    document.body.classList.remove('dragging');
  });
```

To:

```js
  container.addEventListener('dragend', (e) => {
    stopAutoScroll();
    document.body.classList.remove('dragging');
    const source = container.querySelector('.dragging-source');
    if (source) source.classList.remove('dragging-source');
  });
```

Note: We find the source via `.querySelector('.dragging-source')` rather than using `e.target` on dragend because `e.target` on dragend may not reliably point to the original element in all browsers.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/dragDrop.spec.js`
Expected: PASS

If the `requestAnimationFrame` test timing is flaky in jsdom, try applying the class synchronously instead (remove the `requestAnimationFrame` wrapper). The browser captures the ghost image before the sync JS in the `dragstart` handler completes in most browsers. If the ghost image disappears, add it back with rAF.

- [ ] **Step 6: Commit**

```bash
git add src/exchange/dragDrop.js public/css/base/reset.css spec/exchange/dragDrop.spec.js
git commit -m "fix: hide source element during drag to prevent container growth"
```

---

### Task 7: Mobile CSS Fixes

**Files:**
- Modify: `public/css/responsive.css:84-91,115-120`
- Modify: `public/css/themes/secret-santa.css` (may need adjustments)

No unit tests for CSS — verify visually.

- [ ] **Step 1: Add SS mode 723px breakpoint**

In `public/css/responsive.css`, add a new media query **before** the existing `630px` breakpoint (around line 29, before `@media screen and (max-width: 630px)`):

```css
@media screen and (max-width: 723px) {
  #left-container.secret {
    display: block;
  }
  #left-container.secret #name-list,
  #left-container.secret .household,
  #left-container.secret .ghost-house {
    width: auto;
    max-width: 347px;
    margin: 0 auto 12px;
  }
}
```

`display: block` overrides the `display: flex; flex-wrap: wrap` from `secret-santa.css`, switching to the stacked single-column layout like normal mode. `width: auto` overrides the `333px` fixed width.

- [ ] **Step 2: Add .sendEmails to 429px breakpoint**

In `public/css/responsive.css`, inside the existing `@media screen and (max-width: 429px)` block (lines 115-120), add `.sendEmails`:

```css
@media screen and (max-width: 429px) {
  #emailTable {
    min-width: 95%;
    margin: 0 5px;
  }
  .sendEmails {
    min-width: 95%;
    margin-left: 5px;
    margin-right: 5px;
  }
}
```

Note: Use `margin-left`/`margin-right` instead of shorthand `margin: 0 5px` to avoid overriding `top` positioning from `email-confirmation.css`.

- [ ] **Step 3: Verify breakpoint cascade**

Check that the 630px breakpoint's `.household, #name-list { max-width: 320px }` on lines 75-78 still works correctly for SS mode below 630px. Since the 630px rule uses the plain `.household, #name-list` selectors (not scoped to `.secret`), and the 723px rule uses `#left-container.secret .household` (higher specificity), the 630px rule may NOT override at small screens.

If the 630px rule doesn't apply due to lower specificity, add matching rules inside the 630px block:

```css
/* Inside existing 630px block, after line 93 */
#left-container.secret #name-list,
#left-container.secret .household,
#left-container.secret .ghost-house {
  max-width: 320px;
}
```

- [ ] **Step 4: Commit**

```bash
git add public/css/responsive.css
git commit -m "style: fix SS mode mobile layout and sendEmails width on small screens"
```

---

## Chunk 4: Email Retry + Back Buttons (Tasks 8-9)

### Task 8: Email Retry Flow — One Retry Max

**Files:**
- Modify: `src/exchange/components/EmailTable/FailedEmails.js`
- Modify: `src/exchange/components/EmailTable/EmailTable.js:63-77`
- Test: `spec/exchange/components/EmailTable/FailedEmails.spec.js`
- Test: `spec/exchange/components/EmailTable/EmailTable.spec.js`

- [ ] **Step 1: Write failing test for retry count limit**

In `spec/exchange/components/EmailTable/FailedEmails.spec.js`, add tests:

```js
describe("retry limit", () => {
    it("shows retry and back buttons on first failure", () => {
        showFailedEmails(["a@test.com"], {
            participants: [{name: "A", email: "a@test.com"}],
            assignments: [{giver: "A", recipient: "B"}],
        });
        expect(document.querySelector("#retryEmailsBtn")).not.toBeNull();
        expect(document.querySelector("#backToEmailsBtn")).not.toBeNull();
    });

    it("shows apology and view results button after second failure", async () => {
        // First failure
        showFailedEmails(["a@test.com"], {
            participants: [{name: "A", email: "a@test.com"}],
            assignments: [{giver: "A", recipient: "B"}],
        });
        // Simulate retry that also fails
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true, status: 200,
            json: () => Promise.resolve({emailsFailed: ["a@test.com"], sent: 0, total: 1})
        }));
        click("#retryEmailsBtn");
        await waitFor(() => {
            expect(document.querySelector("#retryEmailsBtn")).toBeNull();
            expect(document.querySelector("#viewResultsBtn")).not.toBeNull();
            expect(document.body.innerHTML).toContain("We're sorry");
        });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/components/EmailTable/FailedEmails.spec.js`
Expected: FAIL — no `#backToEmailsBtn`, no retry limit, no `#viewResultsBtn`

- [ ] **Step 3: Implement retry tracking and templates**

Rewrite `src/exchange/components/EmailTable/FailedEmails.js`:

```js
import {addEventListener, pushHTML, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../../utils.js";
import {showError, showSuccess} from "../../../Snackbar.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../../state.js";

const failedEmailsId = "failedEmails";
const retryEmailsBtnId = "retryEmailsBtn";
const backToEmailsBtnId = "backToEmailsBtn";
const viewResultsBtnId = "viewResultsBtn";

let retryCount = 0;

export function resetRetryCount() {
  retryCount = 0;
}

export function removeFailedEmails() {
  selectElement(`#${failedEmailsId}`)?.remove();
}

function failedEmailsTemplate(emailsFailed) {
  return `
    <div id="${failedEmailsId}" class="sendEmails show">
      <p>Your exchange data has been saved. You can retrieve it by entering a participant's email in the recipient search on the home page.</p>
      <p>However, we were unable to send emails to the following addresses:</p>
      <ul>${emailsFailed.map(e => `<li>${escapeAttr(e)}</li>`).join('')}</ul>
      <div>
        <button class="button" id="${retryEmailsBtnId}">Retry</button>
        <button class="button" id="${backToEmailsBtnId}">\u2190 Back</button>
      </div>
    </div>`;
}

function finalFailureTemplate(emailsFailed) {
  return `
    <div id="${failedEmailsId}" class="sendEmails show">
      <p>We're sorry, we were unable to send emails to the following addresses:</p>
      <ul>${emailsFailed.map(e => `<li>${escapeAttr(e)}</li>`).join('')}</ul>
      <p>Would you like to view the results and notify your participants yourself?</p>
      <button class="button" id="${viewResultsBtnId}">View Results</button>
    </div>`;
}

export function showFailedEmails(emailsFailed, payload, {onBack} = {}) {
  const failedAssignments = payload.assignments.filter(a => {
    const participant = payload.participants.find(p => p.name === a.giver);
    return participant && emailsFailed.includes(participant.email);
  });
  const failedParticipants = payload.participants.filter(p =>
    emailsFailed.includes(p.email)
  );

  if (retryCount >= 1) {
    pushHTML("body", finalFailureTemplate(emailsFailed));
    addEventListener(`#${viewResultsBtnId}`, "click", () => {
      removeFailedEmails();
      stateEvents.emit(Events.EMAIL_RESULTS_REQUESTED, {});
    });
    return;
  }

  pushHTML("body", failedEmailsTemplate(emailsFailed));
  addEventListener(`#${retryEmailsBtnId}`, "click", () =>
    retryFailedEmails(failedParticipants, failedAssignments, onBack)
  );
  if (onBack) {
    addEventListener(`#${backToEmailsBtnId}`, "click", () => {
      removeFailedEmails();
      onBack(failedParticipants, failedAssignments);
    });
  }
}

async function retryFailedEmails(participants, assignments, onBack) {
  setLoadingState(`#${retryEmailsBtnId}`);
  retryCount++;

  await apiFetch("/.netlify/functions/api-giver-notify-post", {
    method: "POST",
    body: {participants, assignments},
    onSuccess: (data) => {
      removeFailedEmails();
      if (data.emailsFailed && data.emailsFailed.length > 0) {
        showFailedEmails(data.emailsFailed, {participants, assignments}, {onBack});
      } else {
        showSuccess("Emails sent successfully!");
      }
    },
    onError: () => {
      removeFailedEmails();
      retryCount = 1; // Force final failure state
      showFailedEmails(
        participants.map(p => p.email),
        {participants, assignments}
      );
    },
    fallbackMessage: "Retry failed.",
  });
}
```

**Circular dependency note**: `EmailTable.js` imports from `FailedEmails.js` and now `FailedEmails.js` needs to call back to `EmailTable.js`. The `onBack` callback pattern avoids this circular dependency — `EmailTable.js` passes the callback when calling `showFailedEmails`:

```js
// In EmailTable.js's submitEmails onSuccess handler:
showFailedEmails(data.emailsFailed, payload, {
  onBack: (failedParticipants, failedAssignments) => renderWithSubset(failedParticipants, failedAssignments)
});
```

The `api-giver-notify-post` endpoint expects `{participants: [{name, email}], assignments: [{giver, recipient}]}` — this matches the payload shape used by `FailedEmails.js`.

- [ ] **Step 4: Add renderWithSubset to EmailTable.js**

In `src/exchange/components/EmailTable/EmailTable.js`, add after the `render` function (line 77):

```js
export function renderWithSubset(participants, assignments) {
  const existing = selectElement(`#${emailTableId}`);
  if (existing) existing.remove();
  pushHTML("body", template({participants}));
  addEventListener(`#${emailTableBodyId}`, "submit", (event) => {
    event.preventDefault();
    const {inputs, duplicates} = findDuplicateEmails();
    if (duplicates.size > 0) {
      inputs.forEach(input => {
        if (duplicates.has(input.value.trim().toLowerCase())) {
          input.classList.add("duplicate-email");
        }
      });
      showError("Each participant must have a unique email address");
      return;
    }
    setLoadingState(`#${submitEmailsId}`);
    const emails = getEmails();
    const updatedParticipants = participants.map((p, i) => ({
      ...p,
      email: emails[i]?.email || p.email,
    }));
    retryWithUpdatedEmails(updatedParticipants, assignments);
  });
  selectElement(`#${emailTableBodyId}`).addEventListener("input", (e) => {
    if (e.target.classList.contains("emailInput")) {
      e.target.classList.remove("duplicate-email");
    }
  });
}

async function retryWithUpdatedEmails(participants, assignments) {
  await apiFetch("/.netlify/functions/api-giver-notify-post", {
    method: "POST",
    body: {participants, assignments},
    onSuccess: (data) => {
      hideEmailTable();
      if (data.emailsFailed && data.emailsFailed.length > 0) {
        showFailedEmails(data.emailsFailed, {participants, assignments});
      } else {
        showSuccess("Emails sent successfully!");
      }
    },
    onError: (msg) => showError(msg),
    fallbackMessage: "Failed to send emails. Please try again.",
  });
}
```

Also hide the "Send Me the Results" section and dismiss button in `renderWithSubset` since we're only showing the email correction form — either remove those elements from the template or hide them via `style.display = "none"` after rendering.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/EmailTable/FailedEmails.spec.js spec/exchange/components/EmailTable/EmailTable.spec.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/exchange/components/EmailTable/FailedEmails.js src/exchange/components/EmailTable/EmailTable.js spec/exchange/components/EmailTable/FailedEmails.spec.js spec/exchange/components/EmailTable/EmailTable.spec.js
git commit -m "feat: limit email retry to once, then offer results view"
```

---

### Task 9: Back Button from "Send Me the Results"

**Files:**
- Modify: `src/exchange/components/EmailTable/SendResults.js:19-33,52-67`
- Modify: `src/exchange/components/EmailTable/EmailTable.js` (export `render`)
- Test: `spec/exchange/components/EmailTable/SendResults.spec.js`

- [ ] **Step 1: Write failing test for back button**

In `spec/exchange/components/EmailTable/SendResults.spec.js`, add tests:

```js
it("shows back button on confirmation screen", () => {
    showConfirmation(mockState);
    expect(document.querySelector("#sendResultsBackBtn")).not.toBeNull();
});

it("back button removes confirmation and re-renders email table", () => {
    showConfirmation(mockState);
    click("#sendResultsBackBtn");
    expect(document.querySelector("#sendResultsConfirm")).toBeNull();
    expect(document.querySelector("#emailTable")).not.toBeNull();
});

it("shows back button on results form", () => {
    showConfirmation(mockState);
    click("#sendResultsConfirmBtn"); // Continue to form
    expect(document.querySelector("#sendResultsBackBtn")).not.toBeNull();
});
```

Adjust `mockState` to match the shape expected by `showConfirmation` — needs `{isSecretSanta, participants, assignments}`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: FAIL — no `#sendResultsBackBtn` element exists

- [ ] **Step 3: Export render from EmailTable.js**

In `src/exchange/components/EmailTable/EmailTable.js`, export the `render` function. Change line 63 from:

```js
function render(state) {
```

To:

```js
export function render(state) {
```

- [ ] **Step 4: Add back button to SendResults templates**

In `src/exchange/components/EmailTable/SendResults.js`:

Add new constant at the top:
```js
const sendResultsBackBtnId = "sendResultsBackBtn";
```

Import `render` from EmailTable:
```js
import {render as renderEmailTable} from "./EmailTable.js";
```

Update `confirmationTemplate` (lines 19-33) to include a back button. Change the buttons div from:

```js
    html += `
      <div>
        <button class="button" id="${confirmBtnId}">Continue</button>
        <button class="button" id="${cancelBtnId}">Cancel</button>
      </div>
    </div>`;
```

To:

```js
    html += `
      <div>
        <button class="button" id="${confirmBtnId}">Continue</button>
        <button class="button" id="${cancelBtnId}">Cancel</button>
        <button class="button" id="${sendResultsBackBtnId}">\u2190 Back</button>
      </div>
    </div>`;
```

Add back button to `resultsFormTemplate` (lines 52-67). Add before the closing `</div>`:

```js
      <button class="button" id="${sendResultsBackBtnId}">\u2190 Back</button>
```

In `showConfirmation` (line 35-41), add a listener for the back button:

```js
addEventListener(`#${sendResultsBackBtnId}`, "click", () => {
    selectElement(`#${confirmId}`)?.remove();
    renderEmailTable(state);
});
```

In `showResultsForm` (line 70-75), add a listener for the back button:

```js
addEventListener(`#${sendResultsBackBtnId}`, "click", () => {
    selectElement(`#${sendResultsFormId}`)?.remove();
    renderEmailTable(state);
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/EmailTable/SendResults.spec.js`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/exchange/components/EmailTable/SendResults.js src/exchange/components/EmailTable/EmailTable.js spec/exchange/components/EmailTable/SendResults.spec.js
git commit -m "feat: add back button to Send Me the Results component"
```

---

## Chunk 5: Final Verification

### Task 10: Run Full Test Suite

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 2: Fix any failures**

If any tests fail due to interactions between changes, fix them.

- [ ] **Step 3: Manual verification checklist**

Start the dev server and verify in browser:

1. **Recipient search**: Search by email → shows "[Giver] is buying a gift for [Recipient]!" with date below
2. **House terminology**: All references say "House"/"Household" not "Group"
3. **Ghost house on reuse**: Go to reuse page, load an exchange → ghost house appears on home page
4. **Drag and drop**: Drag a name → source element disappears, dropzone shows in target
5. **Email retry**: Submit with bad emails → retry once → second failure shows "View Results" button
6. **Send Results back**: Click "Send Me the Results" → back button returns to email table
7. **Mobile SS mode**: Resize to 723px in SS mode → cards stack vertically
8. **Mobile .sendEmails**: Resize to 429px → Send Results form fills viewport width
