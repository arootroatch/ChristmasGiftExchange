# WishlistEdit Components Own Their Markup + EmailQuery Slot + Test Restructure

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move section HTML out of page HTML files and into the components that manage them, then restructure and rename `tests/` to `spec/` mirroring `src/` layout.

**Architecture:** Each component gets a `template()` function returning its HTML string. `init()` renders the template into a `data-slot` div in the page HTML, then subscribes to events and attaches listeners. Page HTML files become minimal shells with slot divs defining layout order.

**Tech Stack:** Vanilla JS, Vitest + jsdom

---

### Task 1: Greeting.js owns its markup

**Files:**
- Modify: `src/wishlistEdit/components/Greeting.js`
- Modify: `pages/wishlist/edit/index.html`

**Step 1: Update Greeting.js to render its own template**

Replace the entire file:

```js
import {wishlistEditEvents, WishlistEditEvents} from '../state.js';
import {selectElement} from '../../utils.js';

function template() {
    return '<h1 id="greeting">Loading...</h1>';
}

export function init() {
    selectElement('[data-slot="greeting"]').innerHTML = template();
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, render);
}

function render({userName}) {
    selectElement("#greeting").textContent = `Hi ${userName}, add your wishlist!`;
}
```

**Step 2: Update index.html — replace greeting h1 with slot**

Replace:
```html
<h1 id="greeting">Loading...</h1>
```

With:
```html
<div data-slot="greeting"></div>
```

**Step 3: Run tests to verify**

Run: `npx vitest run tests/wishlistEdit.spec.js`
Expected: All 25 tests pass

**Step 4: Commit**

```
refactor: Greeting component owns its markup
```

---

### Task 2: SaveButton.js owns its markup

**Files:**
- Modify: `src/wishlistEdit/components/SaveButton.js`
- Modify: `pages/wishlist/edit/index.html`

**Step 1: Update SaveButton.js to render its own template**

Add `template()` and update `init()` to render into slot before attaching listener. The rest of the file stays the same:

```js
import {wishlistEditEvents, WishlistEditEvents} from '../state.js';
import {addEventListener, selectElement} from '../../utils.js';
import * as snackbar from '../../Snackbar.js';

let cachedUserData;

function template() {
    return '<button id="save-wishlist-btn" class="button primary">Save Wishlist</button>';
}

function cacheUserData({userData}) {
    cachedUserData = userData;
}

export function init(token) {
    selectElement('[data-slot="save"]').innerHTML = template();
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, cacheUserData);
    wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, cacheUserData);
    wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, cacheUserData);
    addEventListener("#save-wishlist-btn", "click", () => save(token));
}

async function save(token) {
    const response = await fetch(`/.netlify/functions/api-user-wishlist-put/${token}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            wishlists: cachedUserData.wishlists,
            wishItems: cachedUserData.wishItems,
        }),
    });
    if (response.ok) {
        snackbar.showSuccess("Wishlist saved!");
    } else {
        snackbar.showError("Failed to save wishlist");
    }
}
```

**Step 2: Update index.html — replace save button with slot**

Replace:
```html
<button id="save-wishlist-btn" class="button primary">Save Wishlist</button>
```

With:
```html
<div data-slot="save"></div>
```

**Step 3: Run tests to verify**

Run: `npx vitest run tests/wishlistEdit.spec.js`
Expected: All 25 tests pass

**Step 4: Commit**

```
refactor: SaveButton component owns its markup
```

---

### Task 3: WishlistList.js owns its markup

**Files:**
- Modify: `src/wishlistEdit/components/WishlistList.js`
- Modify: `pages/wishlist/edit/index.html`

**Step 1: Update WishlistList.js to render its own template**

Add `template()` with the full section HTML and update `init()` to render into slot before attaching listeners:

```js
import {wishlistEditEvents, WishlistEditEvents, addWishlist, deleteWishlist} from '../state.js';
import {escape, escapeAttr, selectElement, addEventListener} from '../../utils.js';

function template() {
    return `<section id="wishlists-section">
        <h2>External Wishlists</h2>
        <p class="helper-text">Add links to your Amazon, Wishlist.com, or other wishlists</p>
        <div id="wishlists-list"></div>
        <div id="add-wishlist-form">
            <input type="url" id="wishlist-url" placeholder="Wishlist URL"/>
            <input type="text" id="wishlist-title" placeholder="Title (optional)"/>
            <button id="add-wishlist-btn" class="button">Add</button>
        </div>
    </section>`;
}

const entryTemplate = (url, title, index) => `
    <div class="wishlist-entry">
        <a href="${escapeAttr(url)}" target="_blank">${escape(title || url)}</a>
        <button class="delete-btn" data-type="wishlists" data-index="${index}">X</button>
    </div>`;

export function init() {
    selectElement('[data-slot="wishlists"]').innerHTML = template();
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, render);
    wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, render);
    addEventListener("#add-wishlist-btn", "click", handleAdd);
    addEventListener("#wishlists-list", "click", handleDelete);
}

function render({userData}) {
    selectElement("#wishlists-list").innerHTML = userData.wishlists.map((w, i) =>
        entryTemplate(w.url, w.title, i)
    ).join("");
}

function handleAdd() {
    const url = selectElement("#wishlist-url").value.trim();
    const title = selectElement("#wishlist-title").value.trim();
    if (!url) return;
    addWishlist({url, title: title || url});
    selectElement("#wishlist-url").value = "";
    selectElement("#wishlist-title").value = "";
}

function handleDelete(event) {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;
    deleteWishlist(parseInt(btn.dataset.index));
}
```

**Step 2: Update index.html — replace wishlists section with slot**

Replace the entire `<section id="wishlists-section">...</section>` block with:
```html
<div data-slot="wishlists"></div>
```

**Step 3: Run tests to verify**

Run: `npx vitest run tests/wishlistEdit.spec.js`
Expected: All 25 tests pass

**Step 4: Commit**

```
refactor: WishlistList component owns its markup
```

---

### Task 4: ItemList.js owns its markup

**Files:**
- Modify: `src/wishlistEdit/components/ItemList.js`
- Modify: `pages/wishlist/edit/index.html`

**Step 1: Update ItemList.js to render its own template**

Same pattern as WishlistList but with items-specific HTML:

```js
import {wishlistEditEvents, WishlistEditEvents, addItem, deleteItem} from '../state.js';
import {escape, escapeAttr, selectElement, addEventListener} from '../../utils.js';

function template() {
    return `<section id="items-section">
        <h2>Individual Items</h2>
        <p class="helper-text">Add links to specific products you'd like</p>
        <div id="items-list"></div>
        <div id="add-item-form">
            <input type="url" id="item-url" placeholder="Product URL"/>
            <input type="text" id="item-title" placeholder="Title (optional)"/>
            <button id="add-item-btn" class="button">Add</button>
        </div>
    </section>`;
}

const entryTemplate = (url, title, index) => `
    <div class="wishlist-entry">
        <a href="${escapeAttr(url)}" target="_blank">${escape(title || url)}</a>
        <button class="delete-btn" data-type="wishItems" data-index="${index}">X</button>
    </div>`;

export function init() {
    selectElement('[data-slot="items"]').innerHTML = template();
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, render);
    wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, render);
    addEventListener("#add-item-btn", "click", handleAdd);
    addEventListener("#items-list", "click", handleDelete);
}

function render({userData}) {
    selectElement("#items-list").innerHTML = userData.wishItems.map((item, i) =>
        entryTemplate(item.url, item.title, i)
    ).join("");
}

function handleAdd() {
    const url = selectElement("#item-url").value.trim();
    const title = selectElement("#item-title").value.trim();
    if (!url) return;
    addItem({url, title: title || url});
    selectElement("#item-url").value = "";
    selectElement("#item-title").value = "";
}

function handleDelete(event) {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;
    deleteItem(parseInt(btn.dataset.index));
}
```

**Step 2: Update index.html — replace items section with slot**

Replace the entire `<section id="items-section">...</section>` block with:
```html
<div data-slot="items"></div>
```

**Step 3: Run tests to verify**

Run: `npx vitest run tests/wishlistEdit.spec.js`
Expected: All 25 tests pass

**Step 4: Commit**

```
refactor: ItemList component owns its markup
```

---

### Task 5: ContactForm.js owns its markup

**Files:**
- Modify: `src/wishlistEdit/components/ContactForm.js`
- Modify: `pages/wishlist/edit/index.html`

**Step 1: Update ContactForm.js to render its own template**

Add `template()` with the full contact section HTML and update `init()`:

```js
import {addEventListener, selectElement} from '../../utils.js';
import * as snackbar from '../../Snackbar.js';

function template() {
    return `<section id="contact-section">
        <h2>Send Contact Info to Your Secret Santa</h2>
        <p class="helper-text">This information will be emailed directly to your Secret Santa and will NOT be stored.</p>
        <label for="contact-address">Shipping Address</label>
        <textarea id="contact-address" rows="3" placeholder="Your shipping address"></textarea>
        <label for="contact-phone">Phone Number</label>
        <input type="tel" id="contact-phone" placeholder="Your phone number"/>
        <label for="contact-notes">Notes</label>
        <textarea id="contact-notes" rows="2" placeholder="Anything else they should know"></textarea>
        <button id="send-contact-btn" class="button">Send to My Secret Santa</button>
    </section>`;
}

export function init(token) {
    selectElement('[data-slot="contact"]').innerHTML = template();
    addEventListener("#send-contact-btn", "click", () => send(token));
}

async function send(token) {
    const address = selectElement("#contact-address").value.trim();
    const phone = selectElement("#contact-phone").value.trim();
    const notes = selectElement("#contact-notes").value.trim();

    if (!address && !phone && !notes) {
        snackbar.showError("Please fill in at least one field");
        return;
    }

    const response = await fetch(`/.netlify/functions/api-user-contact-post/${token}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({address, phone, notes}),
    });

    if (response.ok) {
        snackbar.showSuccess("Contact info sent to your Secret Santa!");
        selectElement("#contact-address").value = "";
        selectElement("#contact-phone").value = "";
        selectElement("#contact-notes").value = "";
    } else {
        snackbar.showError("Failed to send contact info");
    }
}
```

**Step 2: Update index.html — replace contact section with slot**

Replace the entire `<section id="contact-section">...</section>` block with:
```html
<div data-slot="contact"></div>
```

**Step 3: Verify final pages/wishlist/edit/index.html**

At this point `pages/wishlist/edit/index.html` should look like:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add Your Wishlist</title>
    <link rel="stylesheet" href="/css/pages.css" type="text/css"/>
</head>
<body>
<div id="snackbar" class="hidden"></div>
<div id="container">
    <div data-slot="greeting"></div>
    <div data-slot="wishlists"></div>
    <div data-slot="items"></div>
    <div data-slot="save"></div>
    <hr/>
    <div data-slot="contact"></div>
</div>
<script type="module">
    import {main} from '/src/wishlistEdit/index.js';
    main();
</script>
</body>
</html>
```

**Step 4: Run tests to verify**

Run: `npx vitest run tests/wishlistEdit.spec.js`
Expected: All 25 tests pass, no stderr errors

**Step 5: Commit**

```
refactor: ContactForm component owns its markup
```

---

### Task 6: EmailQuery.js owns its markup

**Files:**
- Modify: `src/exchange/components/EmailQuery.js`
- Modify: `index.html`
- Modify: `tests/components/EmailQuery.spec.js`

**Step 1: Update EmailQuery.js — render into slot on init**

Update `init()` to render the `#query` container into the slot. The component already has `emailQueryInit` as a template. Add a `template()` that wraps it in the `#query` div:

```js
import {addEventListener, removeEventListener, selectElement, setLoadingState, escapeAttr} from "../../utils";

const emailQueryId = "emailQuery";
const emailQueryBtnId = "emailQueryBtn";
const queryDivId = "query";

export const emailQueryInput =
  `<div>
        <input
            type="email"
            maxlength="100"
            id="${emailQueryId}"
            placeholder="Enter your email to search"
        />
        <button
            type="submit"
            class="button queryBtn"
            id="${emailQueryBtnId}"
        >
        Search it!
        </button>
    </div>`

export const emailQueryInit =
  `<label for="${emailQueryId}">
        Need to know who you're buying a gift for?
    </label>
    ${emailQueryInput}`

export const emailQueryError =
  `<div style="color:#b31e20">
        Email address not found!
    </div>`

function template() {
    return `<div id="${queryDivId}" class="emailQuery">${emailQueryInit}</div>`;
}

export function emailQueryResult(date, recipient) {
  return `
    <div>
        As of ${escapeAttr(date.toDateString())}, you're buying a gift for <span>${escapeAttr(recipient)}!</span>
    </div>
    ${emailQueryInput}`;
}

function renderResult(results) {
  const timestamp = Date.parse(results.date);
  const date = new Date(timestamp);
  const queryDiv = selectElement(`#${queryDivId}`);

  let html = emailQueryResult(date, results.recipient);
  if (results.wishlistViewUrl) {
    html += `<a href="${escapeAttr(results.wishlistViewUrl)}" class="button" style="margin-top: 10px; display: inline-block;">View Wishlist</a>`;
  }

  queryDiv.innerHTML = html;
  addEventListener(`#${emailQueryBtnId}`, "click", getName);
}

function renderError() {
  const queryDiv = selectElement(`#${queryDivId}`);

  queryDiv.innerHTML = emailQueryError;
  setTimeout(() => {
    queryDiv.innerHTML = emailQueryInit;
    addEventListener(`#${emailQueryBtnId}`, "click", getName);
  }, 2000);
}

function renderLoadingState() {
  setLoadingState(`#${emailQueryBtnId}`);
  removeEventListener(`#${emailQueryBtnId}`, "click", getName);
}

async function getName(e) {
  e.preventDefault();
  const email = selectElement(`#${emailQueryId}`).value;
  renderLoadingState();

  try {
    const response = await fetch(
      `/.netlify/functions/api-recipient-get?email=${encodeURIComponent(email)}`
    );
    const results = await response.json();
    renderResult(results);
  } catch (error) {
    console.error('Error fetching name:', error);
    renderError();
  }
}

export function init() {
  selectElement('[data-slot="email-query"]').innerHTML = template();
  addEventListener(`#${emailQueryBtnId}`, "click", getName);
}
```

**Step 2: Update index.html — replace #query div with slot**

Replace the entire `<div id="query" class="emailQuery">...</div>` block (lines 61-80) with:
```html
<div data-slot="email-query"></div>
```

**Step 3: Update EmailQuery.spec.js — move query lookup after init()**

The test currently does `const query = document.querySelector("#query")` at describe scope (before `init()` creates `#query`). Move it into `beforeAll` after `init()`:

Change:
```js
describe("getName", () => {
    let emailQueryBtn;
    const query = document.querySelector("#query");
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeAll(() => {
        // Mock console to suppress output during tests
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        init();
    });
```

To:
```js
describe("getName", () => {
    let emailQueryBtn;
    let query;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeAll(() => {
        // Mock console to suppress output during tests
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        init();
        query = document.querySelector("#query");
    });
```

**Step 4: Run tests to verify**

Run: `npx vitest run tests/components/EmailQuery.spec.js`
Expected: All 7 tests pass

Also run full suite: `npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```
refactor: EmailQuery component owns its markup
```

---

### Task 7: Rename tests/ to spec/ and restructure to mirror src/

This is a bulk move operation. All tests must move at once since partial moves break imports.

**Files:**
- Rename: `tests/` → `spec/`
- Modify: `vitest.config.ts` (if needed)
- Modify: all import paths within spec files

**Step 1: Move and restructure directories**

File mapping (old → new):

```
# Shared test utilities
tests/specHelper.js              → spec/specHelper.js
tests/testData.js                → spec/testData.js

# Top-level src/ modules
tests/utils.spec.js              → spec/utils.spec.js
tests/viteMultiPagePlugin.spec.js → spec/viteMultiPagePlugin.spec.js

# src/Snackbar.js (top-level shared)
tests/components/Snackbar.spec.js → spec/Snackbar.spec.js

# src/exchange/
tests/exchangeState.spec.js      → spec/exchange/state.spec.js
tests/generate.spec.js           → spec/exchange/generate.spec.js
tests/dragDrop.spec.js           → spec/exchange/dragDrop.spec.js
tests/main.spec.js               → spec/exchange/index.spec.js
tests/layout.spec.js             → spec/exchange/layout.spec.js

# src/exchange/components/
tests/components/ControlStrip/ControlStrip.spec.js     → spec/exchange/components/ControlStrip/ControlStrip.spec.js
tests/components/ControlStrip/NextStepButton.spec.js   → spec/exchange/components/ControlStrip/NextStepButton.spec.js
tests/components/ControlStrip/AddHouseButton.spec.js   → spec/exchange/components/ControlStrip/AddHouseButton.spec.js
tests/components/ControlStrip/GenerateButton.spec.js   → spec/exchange/components/ControlStrip/GenerateButton.spec.js
tests/components/EmailQuery.spec.js                    → spec/exchange/components/EmailQuery.spec.js
tests/components/EmailTable/EmailTable.spec.js         → spec/exchange/components/EmailTable/EmailTable.spec.js
tests/components/EmailTable/SendEmails.spec.js         → spec/exchange/components/EmailTable/SendEmails.spec.js
tests/components/House.spec.js                         → spec/exchange/components/House.spec.js
tests/components/Instructions.spec.js                  → spec/exchange/components/Instructions.spec.js
tests/components/Name.spec.js                          → spec/exchange/components/Name.spec.js
tests/components/NameList.spec.js                      → spec/exchange/components/NameList.spec.js
tests/components/ResultsTable.spec.js                  → spec/exchange/components/ResultsTable.spec.js

# src/wishlistEdit/
tests/wishlistEdit.spec.js       → spec/wishlistEdit/index.spec.js
tests/wishlistEditState.spec.js  → spec/wishlistEdit/state.spec.js

# src/wishlistView.js, src/reuse.js
tests/wishlistView.spec.js       → spec/wishlistView.spec.js
tests/reuse.spec.js              → spec/reuse.spec.js

# Backend (structure unchanged, just under spec/)
tests/netlify-functions/*        → spec/netlify-functions/*

# Scripts
tests/scripts/*                  → spec/scripts/*
```

Execute with:
```bash
# Create new directory structure
mkdir -p spec/exchange/components/ControlStrip
mkdir -p spec/exchange/components/EmailTable
mkdir -p spec/wishlistEdit
mkdir -p spec/netlify-functions/schemas
mkdir -p spec/scripts

# Move shared utilities
mv tests/specHelper.js spec/specHelper.js
mv tests/testData.js spec/testData.js

# Move top-level specs
mv tests/utils.spec.js spec/utils.spec.js
mv tests/viteMultiPagePlugin.spec.js spec/viteMultiPagePlugin.spec.js
mv tests/components/Snackbar.spec.js spec/Snackbar.spec.js
mv tests/wishlistView.spec.js spec/wishlistView.spec.js
mv tests/reuse.spec.js spec/reuse.spec.js

# Move exchange specs (with renames)
mv tests/exchangeState.spec.js spec/exchange/state.spec.js
mv tests/generate.spec.js spec/exchange/generate.spec.js
mv tests/dragDrop.spec.js spec/exchange/dragDrop.spec.js
mv tests/main.spec.js spec/exchange/index.spec.js
mv tests/layout.spec.js spec/exchange/layout.spec.js

# Move exchange component specs
mv tests/components/ControlStrip/ControlStrip.spec.js spec/exchange/components/ControlStrip/ControlStrip.spec.js
mv tests/components/ControlStrip/NextStepButton.spec.js spec/exchange/components/ControlStrip/NextStepButton.spec.js
mv tests/components/ControlStrip/AddHouseButton.spec.js spec/exchange/components/ControlStrip/AddHouseButton.spec.js
mv tests/components/ControlStrip/GenerateButton.spec.js spec/exchange/components/ControlStrip/GenerateButton.spec.js
mv tests/components/EmailQuery.spec.js spec/exchange/components/EmailQuery.spec.js
mv tests/components/EmailTable/EmailTable.spec.js spec/exchange/components/EmailTable/EmailTable.spec.js
mv tests/components/EmailTable/SendEmails.spec.js spec/exchange/components/EmailTable/SendEmails.spec.js
mv tests/components/House.spec.js spec/exchange/components/House.spec.js
mv tests/components/Instructions.spec.js spec/exchange/components/Instructions.spec.js
mv tests/components/Name.spec.js spec/exchange/components/Name.spec.js
mv tests/components/NameList.spec.js spec/exchange/components/NameList.spec.js
mv tests/components/ResultsTable.spec.js spec/exchange/components/ResultsTable.spec.js

# Move wishlistEdit specs (with renames)
mv tests/wishlistEdit.spec.js spec/wishlistEdit/index.spec.js
mv tests/wishlistEditState.spec.js spec/wishlistEdit/state.spec.js

# Move backend specs
mv tests/netlify-functions/* spec/netlify-functions/

# Move scripts specs
mv tests/scripts/* spec/scripts/

# Remove empty tests/ directory
rm -rf tests/
```

**Step 2: Update all import paths**

Every spec file has relative imports to `specHelper`, `testData`, and `src/` files. These must be updated based on each file's new depth.

**Import path changes by file location:**

Files in `spec/` (depth 1 — same as before for specHelper/testData):
- `spec/utils.spec.js`: `../src/utils` (unchanged)
- `spec/viteMultiPagePlugin.spec.js`: `../src/viteMultiPagePlugin` (unchanged)
- `spec/Snackbar.spec.js`: was `../specHelper` → `./specHelper`; was `../../src/Snackbar` → `../src/Snackbar`
- `spec/wishlistView.spec.js`: `../pages/...` (unchanged)
- `spec/reuse.spec.js`: `../pages/...` (unchanged)

Files in `spec/exchange/` (depth 2):
- `spec/exchange/state.spec.js`: was `../src/exchange/state` → `../../src/exchange/state`; was `./testData` → `../testData`; was `./specHelper` → `../specHelper`
- `spec/exchange/generate.spec.js`: was `./specHelper` → `../specHelper`; was `../src/exchange/generate` → `../../src/exchange/generate`
- `spec/exchange/dragDrop.spec.js`: was `./specHelper` → `../specHelper`; was `../src/exchange/...` → `../../src/exchange/...`
- `spec/exchange/index.spec.js`: was `../src/exchange/index` → `../../src/exchange/index`; was `../src/exchange/...` → `../../src/exchange/...`
- `spec/exchange/layout.spec.js`: was `../src/exchange/state` → `../../src/exchange/state`; was `./specHelper` → `../specHelper`; was `../src/exchange/index` → `../../src/exchange/index`

Files in `spec/exchange/components/` (depth 3):
- was `../specHelper` → `../../specHelper`
- was `../../src/exchange/components/X` → `../../../src/exchange/components/X`
- was `../testData` → `../../testData`
- was `../../src/exchange/state` → `../../../src/exchange/state`

Files in `spec/exchange/components/ControlStrip/` (depth 4):
- was `../../specHelper` → `../../../specHelper`
- was `../../../src/exchange/components/ControlStrip/X` → `../../../../src/exchange/components/ControlStrip/X`

Files in `spec/exchange/components/EmailTable/` (depth 4):
- was `../../specHelper` → `../../../specHelper`
- was `../../testData` → `../../../testData`
- was `../../../src/exchange/components/EmailTable/X` → `../../../../src/exchange/components/EmailTable/X`
- was `../../../src/exchange/state` → `../../../../src/exchange/state`

Files in `spec/wishlistEdit/` (depth 2):
- `spec/wishlistEdit/index.spec.js`: was `../pages/wishlist/edit/index.html` → `../../pages/wishlist/edit/index.html`; was `../src/wishlistEdit/index.js` → `../../src/wishlistEdit/index.js`
- `spec/wishlistEdit/state.spec.js`: was `../src/wishlistEdit/state` → `../../src/wishlistEdit/state`

Files in `spec/netlify-functions/` (depth 2 — unchanged from before):
- All imports use `../../netlify/...` (unchanged)

Files in `spec/scripts/` (depth 2 — unchanged from before):
- Imports unchanged

**Step 3: Move setupTests.js into spec/**

Move `setupTests.js` from root to `spec/setupTests.js` and update `vitest.config.ts`:

```js
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['spec/setupTests.js'],
  },
});
```

**Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 5: Commit**

```
refactor: rename tests/ to spec/ and restructure to mirror src/ layout
```

---

### Task 8: Update CLAUDE.md and MEMORY.md

**Files:**
- Modify: `.claude/CLAUDE.md` — update file structure section
- Modify: auto-memory `MEMORY.md` — update test file references

**Step 1: Update file structure in CLAUDE.md**

Replace the `tests/` tree in the File Structure section with:

```
spec/
  specHelper.js          # Test utilities (initReactiveSystem, resetState, enterName, click, etc.)
  setupTests.js          # JSDOM initialization from index.html
  testData.js
  utils.spec.js
  viteMultiPagePlugin.spec.js
  Snackbar.spec.js
  wishlistView.spec.js
  reuse.spec.js
  exchange/
    state.spec.js
    generate.spec.js
    dragDrop.spec.js
    index.spec.js
    layout.spec.js
    components/
      ControlStrip/
        ControlStrip.spec.js
        NextStepButton.spec.js
        AddHouseButton.spec.js
        GenerateButton.spec.js
      EmailQuery.spec.js
      EmailTable/
        EmailTable.spec.js
        SendEmails.spec.js
      ResultsTable.spec.js
      House.spec.js
      NameList.spec.js
      Name.spec.js
      Instructions.spec.js
  wishlistEdit/
    index.spec.js
    state.spec.js
  netlify-functions/
    api-exchange-post.spec.js
    api-exchange-get.spec.js
    api-exchange-search.spec.js
    api-user-get.spec.js
    api-user-wishlist-put.spec.js
    api-user-contact-post.spec.js
    api-giver-notify-post.spec.js
    api-recipient-get.spec.js
    db.spec.js
    get_name.spec.js
    postToDb.spec.js
    schemas/
      user.spec.js
  scripts/
    migrate-legacy.spec.js
```

**Step 2: Commit**

```
docs: update CLAUDE.md and MEMORY.md for spec/ directory structure
```