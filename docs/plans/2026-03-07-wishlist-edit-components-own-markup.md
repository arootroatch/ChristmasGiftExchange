# WishlistEdit Components Own Their Markup

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move section HTML out of `pages/wishlist/edit/index.html` and into the components that manage them, so each component owns its rendering like React components.

**Architecture:** Each component gets a `template()` function returning its HTML string. `init()` renders the template into a `data-slot` div in index.html, then subscribes to events and attaches listeners. index.html becomes a minimal shell with slot divs defining layout order.

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

**Step 3: Verify final index.html**

At this point `index.html` should look like:

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