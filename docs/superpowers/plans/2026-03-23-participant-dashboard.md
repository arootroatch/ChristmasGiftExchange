# Participant Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate all participant-facing features (recipient lookup, wishlist edit, wishlist view, contact info, reuse exchange) into a single authenticated `/dashboard` page, replacing three separate pages and two home page components.

**Architecture:** New `src/dashboard/` module with its own state, EventEmitter, and components following existing patterns. Home page gets a single DashboardLink component replacing RecipientSearch + ReuseLink. Wishlist edit components move from `src/wishlistEdit/` to `src/dashboard/components/` and rewire to dashboard state. CSS uses the existing `pages.css` stylesheet with new dashboard-specific styles added.

**Tech Stack:** Vanilla JS, EventEmitter pub/sub, Vite multi-page build, Vitest + jsdom for tests

**Spec:** `docs/superpowers/specs/2026-03-23-participant-dashboard-design.md`

---

## File Structure

### New Files
- `pages/dashboard/index.html` — Dashboard HTML page
- `src/dashboard/index.js` — Dashboard entry point (auth flow, initialization)
- `src/dashboard/state.js` — Private state + EventEmitter + mutation functions
- `src/dashboard/components/Collapsible.js` — Reusable expand/collapse section
- `src/dashboard/components/RecipientCard.js` — Always-visible recipient info + inline wishlist view
- `src/dashboard/components/WishlistSection.js` — Collapsible wrapper for wishlist editing
- `src/dashboard/components/WishlistList.js` — Moved from `src/wishlistEdit/components/WishlistList.js`
- `src/dashboard/components/ItemList.js` — Moved from `src/wishlistEdit/components/ItemList.js`
- `src/dashboard/components/SaveButton.js` — Moved from `src/wishlistEdit/components/SaveButton.js`
- `src/dashboard/components/ContactSection.js` — Collapsible wrapper for contact form
- `src/dashboard/components/ContactForm.js` — Moved from `src/wishlistEdit/components/ContactForm.js`
- `src/dashboard/components/ReuseSection.js` — Collapsible wrapper for reuse exchange
- `src/exchange/components/DashboardLink.js` — Home page link to dashboard
- `public/css/components/dashboard.css` — Dashboard-specific styles (collapsible, recipient card)

### New Test Files
- `spec/dashboard/state.spec.js`
- `spec/dashboard/index.spec.js`
- `spec/dashboard/components/Collapsible.spec.js`
- `spec/dashboard/components/RecipientCard.spec.js`
- `spec/dashboard/components/ReuseSection.spec.js`
- `spec/exchange/components/DashboardLink.spec.js`

### Modified Files
- `index.html` — Replace two slots with one `data-slot="dashboard-link"`
- `src/exchange/index.js` — Replace RecipientSearch + ReuseLink imports with DashboardLink
- `src/exchange/firstScreenTemplates.js` — Remove `recipientSearchTemplate`/`reuseLinkTemplate`/`queryDivId`, add `dashboardLinkTemplate`
- `src/vitePrerenderPlugin.js` — Update slot injection for dashboard-link
- `public/css/pages.css` — Add collapsible section styles, dashboard styles
- `netlify/shared/emails/secretSanta.mjs` — Update text to reference dashboard
- `netlify/shared/links.mjs` — Replace old path helpers with dashboard paths
- `spec/vitePrerenderPlugin.spec.js` — Update for new slot
- `spec/setupTests.js` — Update if index.html slots changed

Note: `vitePageRoutes.js` auto-discovers pages from the `pages/` directory, so it does NOT need modification.

### Deleted Files
- `pages/wishlist/edit/index.html`
- `pages/wishlist/view/index.html`
- `pages/reuse/index.html`
- `src/reuse.js`
- `src/wishlistView.js`
- `src/wishlistEdit/` (entire directory)
- `src/exchange/components/RecipientSearch.js`
- `src/exchange/components/ReuseLink.js`
- `src/wishlistEdit/components/Greeting.js` (not moved — dashboard has its own welcome line)
- `spec/wishlistEdit/` (entire directory)
- `spec/exchange/components/RecipientSearch.spec.js`
- `spec/exchange/components/ReuseLink.spec.js`
- `spec/reuse.spec.js`
- `spec/wishlistView.spec.js`

### Updated Test Files
- `spec/exchange/index.spec.js` — If it references RecipientSearch/ReuseLink
- `spec/vitePrerenderPlugin.spec.js` — Update slot assertions
- `e2e/edit-wishlist.spec.js` — Navigate to `/dashboard` instead of `/wishlist/edit`
- `e2e/reuse-exchange.spec.js` — Navigate to `/dashboard` instead of `/reuse`
- `e2e/recipient-search.spec.js` — Navigate to `/dashboard` instead of home page

---

## Task 1: Dashboard State Module

@clojure-tdd (TDD pattern applies — write test, verify fail, implement, verify pass)

**Files:**
- Create: `src/dashboard/state.js`
- Test: `spec/dashboard/state.spec.js`

The dashboard state follows the same pattern as `src/wishlistEdit/state.js` but holds both user data and recipient data.

- [ ] **Step 1: Write test for resetState and setUserData**

```js
// spec/dashboard/state.spec.js
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  dashboardEvents,
  DashboardEvents,
  setUserData,
  resetState,
} from '../../src/dashboard/state.js';

describe('dashboardState', () => {
  beforeEach(() => {
    resetState();
  });

  describe('setUserData', () => {
    it('emits USER_LOADED with user data', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.USER_LOADED, spy);

      setUserData({name: 'John', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userName: 'John',
        userData: {wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []},
      }));
      unsub();
    });
  });

  describe('resetState', () => {
    it('resets to defaults', () => {
      setUserData({name: 'John', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []});
      resetState();

      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.USER_LOADED, spy);
      setUserData({name: '', wishlists: [], wishItems: []});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userName: '',
        userData: {wishlists: [], wishItems: []},
      }));
      unsub();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/dashboard/state.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement initial state module**

```js
// src/dashboard/state.js
import {EventEmitter} from '../EventEmitter.js';

export const dashboardEvents = new EventEmitter();

export const DashboardEvents = {
  USER_LOADED: 'user:loaded',
  WISHLISTS_CHANGED: 'wishlists:changed',
  ITEMS_CHANGED: 'items:changed',
  RECIPIENT_LOADED: 'recipient:loaded',
  RECIPIENT_WISHLIST_LOADED: 'recipient:wishlist:loaded',
};

const dashboardState = {
  userName: '',
  userData: {wishlists: [], wishItems: []},
  recipient: null,
  recipientWishlist: null,
};

export function resetState() {
  dashboardState.userName = '';
  dashboardState.userData = {wishlists: [], wishItems: []};
  dashboardState.recipient = null;
  dashboardState.recipientWishlist = null;
}

export function setUserData(data) {
  dashboardState.userName = data.name;
  dashboardState.userData = {wishlists: data.wishlists, wishItems: data.wishItems};
  dashboardEvents.emit(DashboardEvents.USER_LOADED, {...dashboardState});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/dashboard/state.spec.js`
Expected: PASS

- [ ] **Step 5: Write tests for wishlist mutation functions**

Add to `spec/dashboard/state.spec.js`:

```js
import {
  // ... existing imports plus:
  addWishlist,
  deleteWishlist,
  addItem,
  deleteItem,
} from '../../src/dashboard/state.js';

// Inside describe('dashboardState')

  describe('addWishlist', () => {
    it('adds wishlist and emits WISHLISTS_CHANGED', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.WISHLISTS_CHANGED, spy);

      addWishlist({url: 'https://amazon.com', title: 'My List'});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userData: {wishlists: [{url: 'https://amazon.com', title: 'My List'}], wishItems: []},
      }));
      unsub();
    });
  });

  describe('deleteWishlist', () => {
    it('removes wishlist at index and emits WISHLISTS_CHANGED', () => {
      addWishlist({url: 'https://a.com', title: 'A'});
      addWishlist({url: 'https://b.com', title: 'B'});

      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.WISHLISTS_CHANGED, spy);
      deleteWishlist(0);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userData: {wishlists: [{url: 'https://b.com', title: 'B'}], wishItems: []},
      }));
      unsub();
    });
  });

  describe('addItem', () => {
    it('adds item and emits ITEMS_CHANGED', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.ITEMS_CHANGED, spy);

      addItem({url: 'https://example.com/thing', title: 'Thing', price: '$15'});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userData: {wishlists: [], wishItems: [{url: 'https://example.com/thing', title: 'Thing', price: '$15'}]},
      }));
      unsub();
    });
  });

  describe('deleteItem', () => {
    it('removes item at index and emits ITEMS_CHANGED', () => {
      addItem({url: 'https://a.com', title: 'A', price: '$5'});
      addItem({url: 'https://b.com', title: 'B', price: '$10'});

      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.ITEMS_CHANGED, spy);
      deleteItem(0);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userData: {wishlists: [], wishItems: [{url: 'https://b.com', title: 'B', price: '$10'}]},
      }));
      unsub();
    });
  });
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run spec/dashboard/state.spec.js`
Expected: FAIL — functions not exported

- [ ] **Step 7: Implement wishlist mutation functions**

Add to `src/dashboard/state.js`:

```js
export function addWishlist(wishlist) {
  dashboardState.userData.wishlists.push(wishlist);
  dashboardEvents.emit(DashboardEvents.WISHLISTS_CHANGED, {...dashboardState});
}

export function deleteWishlist(index) {
  dashboardState.userData.wishlists.splice(index, 1);
  dashboardEvents.emit(DashboardEvents.WISHLISTS_CHANGED, {...dashboardState});
}

export function addItem(item) {
  dashboardState.userData.wishItems.push(item);
  dashboardEvents.emit(DashboardEvents.ITEMS_CHANGED, {...dashboardState});
}

export function deleteItem(index) {
  dashboardState.userData.wishItems.splice(index, 1);
  dashboardEvents.emit(DashboardEvents.ITEMS_CHANGED, {...dashboardState});
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run spec/dashboard/state.spec.js`
Expected: PASS

- [ ] **Step 9: Write tests for recipient data functions**

Add to `spec/dashboard/state.spec.js`:

```js
import {
  // ... existing imports plus:
  setRecipientData,
  setRecipientWishlist,
} from '../../src/dashboard/state.js';

  describe('setRecipientData', () => {
    it('emits RECIPIENT_LOADED with recipient info', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.RECIPIENT_LOADED, spy);

      setRecipientData({giverName: 'John', recipient: 'Sarah', date: '2025-12-01', exchangeId: 'exc123'});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        recipient: {giverName: 'John', recipientName: 'Sarah', date: '2025-12-01', exchangeId: 'exc123'},
      }));
      unsub();
    });
  });

  describe('setRecipientWishlist', () => {
    it('emits RECIPIENT_WISHLIST_LOADED with wishlist data', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.RECIPIENT_WISHLIST_LOADED, spy);

      setRecipientWishlist({recipientName: 'Sarah', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        recipientWishlist: {recipientName: 'Sarah', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []},
      }));
      unsub();
    });
  });
```

- [ ] **Step 10: Run test to verify it fails**

Run: `npx vitest run spec/dashboard/state.spec.js`
Expected: FAIL — functions not exported

- [ ] **Step 11: Implement recipient data functions**

Add to `src/dashboard/state.js`:

```js
export function setRecipientData(data) {
  dashboardState.recipient = {
    giverName: data.giverName,
    recipientName: data.recipient,
    date: data.date,
    exchangeId: data.exchangeId,
  };
  dashboardEvents.emit(DashboardEvents.RECIPIENT_LOADED, {...dashboardState});
}

export function setRecipientWishlist(data) {
  dashboardState.recipientWishlist = data;
  dashboardEvents.emit(DashboardEvents.RECIPIENT_WISHLIST_LOADED, {...dashboardState});
}
```

- [ ] **Step 12: Run test to verify it passes**

Run: `npx vitest run spec/dashboard/state.spec.js`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add src/dashboard/state.js spec/dashboard/state.spec.js
git commit -m "feat: add dashboard state module with user and recipient data"
```

---

## Task 2: Collapsible Component

**Files:**
- Create: `src/dashboard/components/Collapsible.js`
- Test: `spec/dashboard/components/Collapsible.spec.js`

A reusable expand/collapse section with heading and chevron. Reads `window.location.hash` to auto-expand on load.

- [ ] **Step 1: Write test for Collapsible**

```js
// spec/dashboard/components/Collapsible.spec.js
import {describe, it, expect, beforeEach} from 'vitest';
import {JSDOM} from 'jsdom';
import {collapsibleTemplate, initCollapsible} from '../../src/dashboard/components/Collapsible.js';

let dom, document;

function setupDOM() {
  dom = new JSDOM(`<!DOCTYPE html><html><body><div id="container"></div></body></html>`, {url: 'http://localhost/dashboard'});
  document = dom.window.document;
  globalThis.document = document;
  globalThis.window = dom.window;
}

describe('Collapsible', () => {
  beforeEach(() => {
    setupDOM();
  });

  it('renders collapsed by default', () => {
    document.getElementById('container').innerHTML = collapsibleTemplate({id: 'wishlist', heading: 'Your Wishlist'});
    initCollapsible('wishlist');

    const content = document.querySelector('#collapsible-wishlist-content');
    expect(content.hidden).toBe(true);
  });

  it('expands when header is clicked', () => {
    document.getElementById('container').innerHTML = collapsibleTemplate({id: 'wishlist', heading: 'Your Wishlist'});
    initCollapsible('wishlist');

    document.querySelector('#collapsible-wishlist-header').click();

    const content = document.querySelector('#collapsible-wishlist-content');
    expect(content.hidden).toBe(false);
  });

  it('collapses when header is clicked again', () => {
    document.getElementById('container').innerHTML = collapsibleTemplate({id: 'wishlist', heading: 'Your Wishlist'});
    initCollapsible('wishlist');

    const header = document.querySelector('#collapsible-wishlist-header');
    header.click();
    header.click();

    const content = document.querySelector('#collapsible-wishlist-content');
    expect(content.hidden).toBe(true);
  });

  it('auto-expands when URL hash matches id', () => {
    dom = new JSDOM(`<!DOCTYPE html><html><body><div id="container"></div></body></html>`, {url: 'http://localhost/dashboard#wishlist'});
    document = dom.window.document;
    globalThis.document = document;
    globalThis.window = dom.window;

    document.getElementById('container').innerHTML = collapsibleTemplate({id: 'wishlist', heading: 'Your Wishlist'});
    initCollapsible('wishlist');

    const content = document.querySelector('#collapsible-wishlist-content');
    expect(content.hidden).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/dashboard/components/Collapsible.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Collapsible**

```js
// src/dashboard/components/Collapsible.js

export function collapsibleTemplate({id, heading}) {
  return `<div class="collapsible" id="collapsible-${id}">
    <div class="collapsible-header" id="collapsible-${id}-header">
      <h2>${heading}</h2>
      <span class="collapsible-chevron">&#9660;</span>
    </div>
    <div class="collapsible-content" id="collapsible-${id}-content" hidden>
    </div>
  </div>`;
}

export function initCollapsible(id) {
  const header = document.querySelector(`#collapsible-${id}-header`);
  const content = document.querySelector(`#collapsible-${id}-content`);
  const chevron = header.querySelector('.collapsible-chevron');

  if (window.location.hash === `#${id}`) {
    content.hidden = false;
    chevron.classList.add('open');
  }

  header.addEventListener('click', () => {
    content.hidden = !content.hidden;
    chevron.classList.toggle('open');
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/dashboard/components/Collapsible.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/components/Collapsible.js spec/dashboard/components/Collapsible.spec.js
git commit -m "feat: add Collapsible component with hash-based auto-expand"
```

---

## Task 3: Move Wishlist Components to Dashboard

Move `WishlistList.js`, `ItemList.js`, `SaveButton.js`, and `ContactForm.js` from `src/wishlistEdit/components/` to `src/dashboard/components/`, rewiring imports from the old state module to the new dashboard state module.

**Files:**
- Move: `src/wishlistEdit/components/WishlistList.js` → `src/dashboard/components/WishlistList.js`
- Move: `src/wishlistEdit/components/ItemList.js` → `src/dashboard/components/ItemList.js`
- Move: `src/wishlistEdit/components/SaveButton.js` → `src/dashboard/components/SaveButton.js`
- Move: `src/wishlistEdit/components/ContactForm.js` → `src/dashboard/components/ContactForm.js`

- [ ] **Step 1: Move WishlistList.js and update imports**

Copy `src/wishlistEdit/components/WishlistList.js` to `src/dashboard/components/WishlistList.js`. Change the import on line 1 from:
```js
import {wishlistEditEvents, WishlistEditEvents, addWishlist, deleteWishlist} from '../state.js';
```
to:
```js
import {dashboardEvents, DashboardEvents, addWishlist, deleteWishlist} from '../state.js';
```
Update all references: `wishlistEditEvents` → `dashboardEvents`, `WishlistEditEvents.USER_LOADED` → `DashboardEvents.USER_LOADED`, `WishlistEditEvents.WISHLISTS_CHANGED` → `DashboardEvents.WISHLISTS_CHANGED`.

- [ ] **Step 2: Move ItemList.js and update imports**

Same pattern: copy, replace `wishlistEditEvents` → `dashboardEvents`, `WishlistEditEvents` → `DashboardEvents`.

- [ ] **Step 3: Move SaveButton.js and update imports**

Same pattern: copy, replace `wishlistEditEvents` → `dashboardEvents`, `WishlistEditEvents` → `DashboardEvents`.

- [ ] **Step 4: Move ContactForm.js**

Copy `src/wishlistEdit/components/ContactForm.js` to `src/dashboard/components/ContactForm.js`. This component has no state imports — it uses `apiFetch` directly. No import changes needed.

- [ ] **Step 5: Verify dashboard state tests still pass**

Run: `npx vitest run spec/dashboard/`
Expected: PASS (state tests still green)

- [ ] **Step 6: Commit**

```bash
git add src/dashboard/components/WishlistList.js src/dashboard/components/ItemList.js src/dashboard/components/SaveButton.js src/dashboard/components/ContactForm.js
git commit -m "feat: move wishlist edit components to dashboard module"
```

---

## Task 4: RecipientCard Component

**Files:**
- Create: `src/dashboard/components/RecipientCard.js`
- Test: `spec/dashboard/components/RecipientCard.spec.js`

Always-visible card showing recipient info. Expands to show recipient's wishlist. Handles no-exchange state.

- [ ] **Step 1: Write test for RecipientCard rendering recipient data**

```js
// spec/dashboard/components/RecipientCard.spec.js
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {JSDOM} from 'jsdom';
import {dashboardEvents, DashboardEvents, resetState, setRecipientData} from '../../src/dashboard/state.js';
import * as recipientCard from '../../src/dashboard/components/RecipientCard.js';

let dom, document;

function setupDOM() {
  dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="snackbar" class="hidden"></div>
    <div data-slot="recipient"></div>
  </body></html>`, {url: 'http://localhost/dashboard'});
  document = dom.window.document;
  globalThis.document = document;
  globalThis.window = dom.window;
  globalThis.fetch = vi.fn();
}

describe('RecipientCard', () => {
  beforeEach(() => {
    setupDOM();
    dashboardEvents.clear();
    resetState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders recipient name when RECIPIENT_LOADED fires', () => {
    recipientCard.init();
    setRecipientData({giverName: 'John', recipient: 'Sarah', date: '2025-12-01T00:00:00Z', exchangeId: 'exc123'});

    const card = document.querySelector('[data-slot="recipient"]');
    expect(card.textContent).toContain('Sarah');
  });

  it('shows no-exchange message when recipient is null', () => {
    recipientCard.init();
    dashboardEvents.emit(DashboardEvents.RECIPIENT_LOADED, {recipient: null});

    const card = document.querySelector('[data-slot="recipient"]');
    expect(card.textContent).toContain('No exchange found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/dashboard/components/RecipientCard.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement RecipientCard**

```js
// src/dashboard/components/RecipientCard.js
import {dashboardEvents, DashboardEvents, setRecipientWishlist} from '../state.js';
import {selectElement, escape, escapeAttr, apiFetch} from '../../utils.js';

function template() {
  return `<section id="recipient-card">
    <div class="spinner-container"><div class="spinner"></div></div>
  </section>`;
}

export function init() {
  selectElement('[data-slot="recipient"]').innerHTML = template();
  dashboardEvents.on(DashboardEvents.RECIPIENT_LOADED, renderRecipient);
  dashboardEvents.on(DashboardEvents.RECIPIENT_WISHLIST_LOADED, renderWishlist);
}

function renderRecipient({recipient}) {
  const card = selectElement('#recipient-card');
  if (!recipient) {
    card.innerHTML = `<p>No exchange found yet. Once you've been added to a gift exchange, your recipient will appear here.</p>`;
    return;
  }

  const date = new Date(recipient.date);
  card.innerHTML = `
    <p class="recipient-reveal">You're buying a gift for <strong>${escape(recipient.recipientName)}!</strong></p>
    <p class="date-secondary">As of ${escape(date.toDateString())}</p>
    <div class="recipient-actions">
      <button id="view-wishlist-btn" class="button">View ${escape(recipient.recipientName)}'s Wishlist</button>
      <button id="email-wishlist-btn" class="button">Email Me ${escape(recipient.recipientName)}'s Wish List</button>
    </div>
    <div id="recipient-wishlist-view" hidden></div>`;

  selectElement('#view-wishlist-btn').addEventListener('click', () => loadRecipientWishlist(recipient.exchangeId));
  selectElement('#email-wishlist-btn').addEventListener('click', (e) => sendWishlistEmail(e, recipient.exchangeId));
}

async function loadRecipientWishlist(exchangeId) {
  const btn = selectElement('#view-wishlist-btn');
  btn.disabled = true;
  btn.textContent = 'Loading...';

  await apiFetch(`/.netlify/functions/api-user-wishlist-get?exchangeId=${encodeURIComponent(exchangeId)}`, {
    method: 'GET',
    onSuccess: (data) => setRecipientWishlist(data),
    onError: () => {
      btn.textContent = 'Could not load wishlist';
      btn.disabled = true;
    },
    fallbackMessage: 'Could not load wishlist',
  });
}

function renderWishlist({recipientWishlist}) {
  const container = selectElement('#recipient-wishlist-view');
  if (!container) return;
  container.hidden = false;
  const btn = selectElement('#view-wishlist-btn');
  if (btn) btn.hidden = true;

  const data = recipientWishlist;
  if (data.wishlists.length === 0 && data.wishItems.length === 0) {
    container.innerHTML = `<p>${escape(data.recipientName)} hasn't added any wishlists yet. Check back later!</p>`;
    return;
  }

  let html = '';
  if (data.wishlists.length > 0) {
    html += '<h3>Wishlists</h3><ul>';
    data.wishlists.forEach(w => {
      html += `<li><a href="${escapeAttr(w.url)}" target="_blank">${escape(w.title || w.url)}</a></li>`;
    });
    html += '</ul>';
  }
  if (data.wishItems.length > 0) {
    html += '<h3>Individual Items</h3><ul>';
    data.wishItems.forEach(item => {
      const price = item.price ? ` <span class="item-price">${escape(item.price)}</span>` : '';
      html += `<li><a href="${escapeAttr(item.url)}" target="_blank">${escape(item.title || item.url)}</a>${price}</li>`;
    });
    html += '</ul>';
  }
  container.innerHTML = html;
}

async function sendWishlistEmail(e, exchangeId) {
  e.preventDefault();
  const btn = selectElement('#email-wishlist-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  await apiFetch('/.netlify/functions/api-wishlist-email-post', {
    method: 'POST',
    body: {exchangeId},
    onSuccess: () => {
      btn.textContent = 'Email sent!';
    },
    onError: (msg) => {
      btn.textContent = msg || 'Failed to send email';
    },
    fallbackMessage: 'Failed to send email. Please try again.',
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/dashboard/components/RecipientCard.spec.js`
Expected: PASS

- [ ] **Step 5: Write additional tests** (view wishlist button, email button, no-wishlist state)

Add tests for:
- Clicking "View Wishlist" button calls the API
- Wishlist renders when RECIPIENT_WISHLIST_LOADED fires
- Empty wishlist shows "hasn't added any wishlists yet" message
- Email button sends request

- [ ] **Step 6: Run all tests and verify they pass**

Run: `npx vitest run spec/dashboard/`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/dashboard/components/RecipientCard.js spec/dashboard/components/RecipientCard.spec.js
git commit -m "feat: add RecipientCard component with inline wishlist view"
```

---

## Task 5: WishlistSection and ContactSection Wrappers

**Files:**
- Create: `src/dashboard/components/WishlistSection.js`
- Create: `src/dashboard/components/ContactSection.js`

Thin wrappers that combine Collapsible with the moved components.

- [ ] **Step 1: Implement WishlistSection**

```js
// src/dashboard/components/WishlistSection.js
import {collapsibleTemplate, initCollapsible} from './Collapsible.js';
import * as wishlistList from './WishlistList.js';
import * as itemList from './ItemList.js';
import * as saveButton from './SaveButton.js';
import {selectElement} from '../../utils.js';

export function init() {
  selectElement('[data-slot="wishlist-section"]').innerHTML = collapsibleTemplate({id: 'wishlist', heading: 'Your Wishlist'});

  const content = selectElement('#collapsible-wishlist-content');
  content.innerHTML = `
    <div data-slot="wishlists"></div>
    <div data-slot="items"></div>
    <div data-slot="save"></div>`;

  initCollapsible('wishlist');
  wishlistList.init();
  itemList.init();
  saveButton.init();
}
```

- [ ] **Step 2: Implement ContactSection**

```js
// src/dashboard/components/ContactSection.js
import {collapsibleTemplate, initCollapsible} from './Collapsible.js';
import * as contactForm from './ContactForm.js';
import {selectElement} from '../../utils.js';

export function init() {
  selectElement('[data-slot="contact-section"]').innerHTML = collapsibleTemplate({id: 'contact', heading: 'Contact Info'});

  const content = selectElement('#collapsible-contact-content');
  content.innerHTML = '<div data-slot="contact"></div>';

  initCollapsible('contact');
  contactForm.init();
}
```

- [ ] **Step 3: Verify integration via dashboard index tests**

WishlistSection and ContactSection are thin wrappers combining Collapsible with already-tested sub-components. Their behavior is verified through `spec/dashboard/index.spec.js` tests (Task 7) which confirm the dashboard renders all sections and that sub-components function within them. Dedicated unit tests for these wrappers would be redundant.

- [ ] **Step 4: Commit**

```bash
git add src/dashboard/components/WishlistSection.js src/dashboard/components/ContactSection.js
git commit -m "feat: add WishlistSection and ContactSection collapsible wrappers"
```

---

## Task 6: ReuseSection Component

**Files:**
- Create: `src/dashboard/components/ReuseSection.js`
- Test: `spec/dashboard/components/ReuseSection.spec.js`

Collapsible section wrapping the reuse exchange logic (extracted from `src/reuse.js`).

- [ ] **Step 1: Write test for ReuseSection**

```js
// spec/dashboard/components/ReuseSection.spec.js
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {JSDOM} from 'jsdom';
import * as reuseSection from '../../src/dashboard/components/ReuseSection.js';

let dom, document;

function setupDOM() {
  dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="snackbar" class="hidden"></div>
    <div data-slot="reuse-section"></div>
  </body></html>`, {url: 'http://localhost/dashboard'});
  document = dom.window.document;
  globalThis.document = document;
  globalThis.window = dom.window;
  globalThis.sessionStorage = dom.window.sessionStorage;
}

function mockFetch(response) {
  globalThis.fetch = vi.fn(() => Promise.resolve({
    ok: response.ok !== undefined ? response.ok : true,
    status: response.status || 200,
    json: () => Promise.resolve(response.body),
  }));
}

const flush = () => new Promise(r => setTimeout(r, 0));

describe('ReuseSection', () => {
  beforeEach(() => {
    setupDOM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders search button inside collapsible', () => {
    reuseSection.init();
    expect(document.getElementById('reuse-search-btn')).toBeTruthy();
    expect(document.getElementById('collapsible-reuse-content').hidden).toBe(true);
  });

  it('renders exchange results after search', async () => {
    reuseSection.init();
    document.getElementById('collapsible-reuse-header').click();

    mockFetch({body: [
      {createdAt: '2025-12-01', participantNames: ['Alice', 'Bob'], houses: [], exchangeId: 'exc1'},
    ]});

    document.getElementById('reuse-search-btn').click();
    await flush();

    expect(document.querySelector('.exchange-result')).toBeTruthy();
    expect(document.querySelector('.exchange-result').textContent).toContain('Alice');
  });

  it('shows inline empty message when no exchanges found', async () => {
    reuseSection.init();
    document.getElementById('collapsible-reuse-header').click();

    mockFetch({body: []});
    document.getElementById('reuse-search-btn').click();
    await flush();

    const content = document.getElementById('reuse-results');
    expect(content.textContent).toContain('No past exchanges found');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/dashboard/components/ReuseSection.spec.js`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ReuseSection**

```js
// src/dashboard/components/ReuseSection.js
import {collapsibleTemplate, initCollapsible} from './Collapsible.js';
import {selectElement, escape, escapeAttr, apiFetch} from '../../utils.js';

export function init() {
  selectElement('[data-slot="reuse-section"]').innerHTML = collapsibleTemplate({id: 'reuse', heading: 'Reuse a Past Exchange'});

  const content = selectElement('#collapsible-reuse-content');
  content.innerHTML = `
    <button id="reuse-search-btn" class="button">Search for Past Exchanges</button>
    <div id="reuse-results"></div>`;

  initCollapsible('reuse');

  selectElement('#reuse-search-btn').addEventListener('click', searchExchanges);
}

async function searchExchanges() {
  const btn = selectElement('#reuse-search-btn');
  btn.textContent = 'Searching...';
  btn.disabled = true;

  await apiFetch('/.netlify/functions/api-my-exchanges-get', {
    method: 'GET',
    onSuccess: (data) => {
      if (data.length === 0) {
        selectElement('#reuse-results').innerHTML = '<p class="empty-state">No past exchanges found.</p>';
        return;
      }
      renderResults(data);
    },
    onError: (msg) => {
      selectElement('#reuse-results').innerHTML = `<p class="empty-state">${escape(msg || 'Failed to search exchanges')}</p>`;
    },
    fallbackMessage: 'Failed to search exchanges. Please try again.',
  });

  btn.textContent = 'Search for Past Exchanges';
  btn.disabled = false;
}

function renderResults(exchanges) {
  const container = selectElement('#reuse-results');
  container.innerHTML = exchanges.map(ex => `
    <div class="exchange-result">
      <h3>${new Date(ex.createdAt).toLocaleDateString()}</h3>
      <p><strong>Participants:</strong> ${escape(ex.participantNames.join(', '))}</p>
      ${ex.houses.length > 0 ? `<p><strong>Households:</strong> ${ex.houses.map(h => `${escape(h.name)} (${escape(h.members.join(', '))})`).join('; ')}</p>` : ''}
      <button class="button use-exchange-btn" data-exchange='${escapeAttr(JSON.stringify(ex))}'>
        Use This Exchange
      </button>
    </div>
  `).join('');

  container.querySelectorAll('.use-exchange-btn').forEach(btn => {
    btn.addEventListener('click', useExchange);
  });
}

function useExchange(event) {
  const exchangeData = JSON.parse(event.currentTarget.dataset.exchange);
  sessionStorage.setItem('reuseExchange', JSON.stringify(exchangeData));
  window.location.href = '/';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/dashboard/components/ReuseSection.spec.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/dashboard/components/ReuseSection.js spec/dashboard/components/ReuseSection.spec.js
git commit -m "feat: add ReuseSection component with inline empty state"
```

---

## Task 7: Dashboard Page HTML and Entry Point

**Files:**
- Create: `pages/dashboard/index.html`
- Create: `src/dashboard/index.js`
- Test: `spec/dashboard/index.spec.js`

- [ ] **Step 1: Create dashboard HTML page**

```html
<!-- pages/dashboard/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Your participant dashboard for the gift exchange.">
    <title>Participant Dashboard</title>
    <link rel="stylesheet" href="/css/pages.css" type="text/css"/>
</head>
<body>
<div id="snackbar" class="hidden"></div>
<div id="container">
    <a href="/" class="back-link">Back to Generator</a>
    <h1>Participant Dashboard</h1>
    <div id="dashboard-content">
        <div class="spinner-container"><div class="spinner"></div></div>
    </div>
</div>
<script type="module">
    import {main} from '/src/dashboard/index.js';
    main();
</script>
</body>
</html>
```

- [ ] **Step 2: Write test for dashboard entry point**

```js
// spec/dashboard/index.spec.js
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import fs from 'fs';
import path from 'path';
import {JSDOM} from 'jsdom';
import {dashboardEvents, resetState} from '../../src/dashboard/state.js';
import {main} from '../../src/dashboard/index.js';

const html = fs.readFileSync(
  path.resolve(__dirname, '../../pages/dashboard/index.html'),
  'utf8'
);

let dom, document, window;

const flush = () => new Promise(r => setTimeout(r, 0));

function setupDOM(url = 'http://localhost/dashboard') {
  dom = new JSDOM(html, {url});
  document = dom.window.document;
  window = dom.window;
  globalThis.document = document;
  globalThis.window = window;
  globalThis.sessionStorage = window.sessionStorage;
}

function mockFetch(response) {
  globalThis.fetch = vi.fn(() => Promise.resolve({
    ok: response.ok !== undefined ? response.ok : true,
    status: response.status || 200,
    json: () => Promise.resolve(response.body),
  }));
}

function mockFetchSequence(responses) {
  let callIndex = 0;
  globalThis.fetch = vi.fn(() => {
    const response = responses[callIndex++] || responses[responses.length - 1];
    return Promise.resolve({
      ok: response.ok !== undefined ? response.ok : true,
      status: response.status || 200,
      json: () => Promise.resolve(response.body),
    });
  });
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    setupDOM();
    dashboardEvents.clear();
    resetState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading spinner initially', () => {
    expect(document.querySelector('.spinner-container')).toBeTruthy();
  });

  it('shows auth gate when api-user-get returns 401', async () => {
    mockFetch({ok: false, status: 401, body: {error: 'Unauthorized'}});
    main();
    await flush();

    expect(document.getElementById('auth-gate')).toBeTruthy();
    expect(document.getElementById('auth-email')).toBeTruthy();
  });

  it('renders dashboard sections on successful auth', async () => {
    mockFetchSequence([
      {ok: true, body: {name: 'John', wishlists: [], wishItems: []}},
      {ok: true, body: {giverName: 'John', recipient: 'Sarah', date: '2025-12-01', exchangeId: 'exc123'}},
    ]);
    main();
    await flush();

    expect(document.querySelector('[data-slot="recipient"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="wishlist-section"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="contact-section"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="reuse-section"]')).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run spec/dashboard/index.spec.js`
Expected: FAIL — module not found

- [ ] **Step 4: Implement dashboard entry point**

```js
// src/dashboard/index.js
import {apiFetch} from '../utils.js';
import * as snackbar from '../Snackbar.js';
import * as cookieBanner from '../CookieBanner.js';
import {authGateTemplate, initAuthGate} from '../authGate.js';
import {setUserData, setRecipientData, dashboardEvents, resetState} from './state.js';
import * as recipientCard from './components/RecipientCard.js';
import * as wishlistSection from './components/WishlistSection.js';
import * as contactSection from './components/ContactSection.js';
import * as reuseSection from './components/ReuseSection.js';

function dashboardLayout(userName) {
  return `
    <p class="dashboard-welcome">Welcome, ${userName}!</p>
    <div data-slot="recipient"></div>
    <div data-slot="wishlist-section"></div>
    <div data-slot="contact-section"></div>
    <div data-slot="reuse-section"></div>`;
}

function initDashboard() {
  recipientCard.init();
  wishlistSection.init();
  contactSection.init();
  reuseSection.init();
}

function showAuthGate() {
  const content = document.getElementById('dashboard-content');
  content.innerHTML = authGateTemplate({heading: 'Verify Your Email'});
  initAuthGate({
    onSuccess: () => {
      content.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';
      loadData();
    },
    onError: (msg) => snackbar.showError(msg),
  });
}

function loadData() {
  apiFetch('/.netlify/functions/api-user-get', {
    method: 'GET',
    onSuccess: (data) => {
      setUserData(data);
      loadRecipient();
    },
    onError: () => showAuthGate(),
  });
}

function loadRecipient() {
  apiFetch('/.netlify/functions/api-recipient-get', {
    method: 'GET',
    onSuccess: (data) => setRecipientData(data),
    onError: () => {
      dashboardEvents.emit('recipient:loaded', {recipient: null});
    },
  });
}

export function main() {
  snackbar.init();
  cookieBanner.init();

  const content = document.getElementById('dashboard-content');
  content.innerHTML = dashboardLayout();
  initDashboard();
  loadData();
}
```

Note: The auth flow keeps the spinner visible until we know if the user has a valid session. Only after `api-user-get` responds do we either show the dashboard or the auth gate. This prevents leaking dashboard structure to unauthenticated users.

The `loadData` function needs to distinguish 401 from other errors. Since `apiFetch` doesn't pass status to `onError`, use a custom fetch call for the initial auth check instead of `apiFetch`. Other API calls within the dashboard (after auth is confirmed) can use `apiFetch` normally.

Update the `loadData` function:

```js
async function loadData() {
  const content = document.getElementById('dashboard-content');
  try {
    const response = await fetch('/.netlify/functions/api-user-get', {method: 'GET'});
    if (response.status === 401) {
      showAuthGate();
      return;
    }
    if (!response.ok) {
      snackbar.showError('Something went wrong. Please try again.');
      return;
    }
    const data = await response.json();
    content.innerHTML = dashboardLayout(data.name);
    initDashboard();
    setUserData(data);
    loadRecipient();
  } catch {
    snackbar.showError('Something went wrong. Please try again.');
  }
}
```

Update `main()` to NOT render dashboard layout prematurely:

```js
export function main() {
  snackbar.init();
  cookieBanner.init();
  loadData();
}
```

The HTML already has a spinner in `#dashboard-content`, which stays visible until `loadData` replaces it.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run spec/dashboard/index.spec.js`
Expected: PASS

- [ ] **Step 6: Write additional tests** (auth gate flow, hash-based auto-expand)

- [ ] **Step 7: Commit**

```bash
git add pages/dashboard/index.html src/dashboard/index.js spec/dashboard/index.spec.js
git commit -m "feat: add dashboard page with auth flow and component initialization"
```

---

## Task 8: Dashboard CSS

**Files:**
- Modify: `public/css/pages.css`

Add collapsible styles and dashboard-specific styles. The dashboard reuses `pages.css` which already has the glass card sections, typography, and responsive styles.

- [ ] **Step 1: Add collapsible and dashboard styles to pages.css**

Append to `public/css/pages.css`:

```css
/* ── Collapsible Sections ──────────────────────────────────── */
.collapsible {
  margin-bottom: 20px;
}

.collapsible-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--frost);
  border: 1px solid var(--frost-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--shadow-card);
}

.collapsible-header:hover {
  border-color: rgba(255, 255, 255, 0.25);
}

.collapsible-header h2 {
  margin: 0;
}

.collapsible-chevron {
  color: var(--text-secondary);
  font-size: 0.8rem;
  transition: transform 0.3s;
}

.collapsible-chevron.open {
  transform: rotate(180deg);
}

.collapsible-content {
  padding: 0 24px 24px;
  background: var(--frost);
  border: 1px solid var(--frost-border);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.collapsible-content section {
  box-shadow: none;
  border: none;
  padding: 20px 0 0;
  margin-bottom: 0;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  animation: none;
}

/* ── Recipient Card ────────────────────────────────────────── */
#recipient-card {
  text-align: center;
}

.recipient-reveal {
  font-size: 1.2rem;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.recipient-reveal strong {
  color: #198c0a;
  font-size: 1.4rem;
}

.date-secondary {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 16px;
}

.recipient-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

#recipient-wishlist-view ul {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
}

#recipient-wishlist-view li {
  padding: 10px 14px;
  margin-bottom: 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-sm);
}

#recipient-wishlist-view a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-weight: 500;
}

#recipient-wishlist-view a:hover {
  color: #fff;
  text-decoration: underline;
}

/* ── Empty State ───────────────────────────────────────────── */
.empty-state {
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  margin-top: 16px;
}

/* ── Dashboard Welcome ─────────────────────────────────────── */
.dashboard-welcome {
  text-align: center;
  color: var(--text-secondary);
  margin: 0 0 24px;
  font-size: 1rem;
}
```

- [ ] **Step 2: Add responsive overrides for collapsibles**

Inside the existing `@media screen and (max-width: 480px)` block in `pages.css`, add:

```css
  .collapsible-header {
    padding: 14px 16px;
  }

  .collapsible-content {
    padding: 0 16px 16px;
  }

  .recipient-actions {
    flex-direction: column;
  }

  .recipient-actions .button {
    width: 100%;
  }
```

- [ ] **Step 3: Commit**

```bash
git add public/css/pages.css
git commit -m "feat: add dashboard collapsible and recipient card CSS"
```

---

## Task 9: DashboardLink Home Page Component

**Files:**
- Create: `src/exchange/components/DashboardLink.js`
- Modify: `src/exchange/firstScreenTemplates.js`
- Modify: `index.html`
- Modify: `src/exchange/index.js`
- Modify: `src/vitePrerenderPlugin.js`
- Test: `spec/exchange/components/DashboardLink.spec.js`

- [ ] **Step 1: Write test for DashboardLink**

```js
// spec/exchange/components/DashboardLink.spec.js
import {describe, it, expect, beforeEach} from 'vitest';
import {initReactiveSystem, resetState, resetDOM, shouldSelect} from '../../specHelper.js';
import * as dashboardLink from '../../../src/exchange/components/DashboardLink.js';
import {startExchange} from '../../../src/exchange/state.js';

describe('DashboardLink', () => {
  beforeEach(() => {
    resetDOM();
    resetState();
    initReactiveSystem();
  });

  it('renders dashboard link in slot', () => {
    dashboardLink.init();
    shouldSelect('[data-slot="dashboard-link"]');
    const slot = document.querySelector('[data-slot="dashboard-link"]');
    expect(slot.innerHTML).toContain('/dashboard');
  });

  it('contains descriptive text about dashboard features', () => {
    dashboardLink.init();
    const slot = document.querySelector('[data-slot="dashboard-link"]');
    expect(slot.textContent.toLowerCase()).toContain('gift');
  });

  it('hides when EXCHANGE_STARTED fires', () => {
    dashboardLink.init();
    startExchange();
    const slot = document.querySelector('[data-slot="dashboard-link"]');
    expect(slot.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/exchange/components/DashboardLink.spec.js`
Expected: FAIL — module not found, slot not in DOM

- [ ] **Step 3: Update index.html — replace two slots with one**

In `index.html`, replace:
```html
        <div data-slot="recipient-search"></div>
        <div data-slot="reuse-link"></div>
```
with:
```html
        <div data-slot="dashboard-link"></div>
```

- [ ] **Step 4: Update setupTests.js if needed**

Check `spec/setupTests.js` — if it reads `index.html`, the new slot will be picked up automatically.

- [ ] **Step 5: Update firstScreenTemplates.js**

Remove `recipientSearchTemplate` and `reuseLinkTemplate`. Add `dashboardLinkTemplate`:

```js
export function dashboardLinkTemplate() {
  return `<div class="dashboardLink">
    <a href="/dashboard" class="button" style="text-decoration: none; width: auto; padding: 14px 28px; font-size: 1rem;">Participant Dashboard</a>
    <p style="margin-top: 12px; font-size: 0.95rem; color: rgba(255,255,255,0.75); line-height: 1.5; max-width: 420px;">
      Find out who you're buying a gift for, peek at their wishlist, share your own wishes and mailing info with your Secret Santa, or even reuse last year's exchange!
    </p>
  </div>`;
}
```

Keep `introTemplate` and `introId`. Remove `queryDivId` (only used by the now-deleted `RecipientSearch.js`).

- [ ] **Step 6: Create DashboardLink.js**

```js
// src/exchange/components/DashboardLink.js
import {selectElement} from '../../utils';
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from '../state.js';
import {dashboardLinkTemplate} from '../firstScreenTemplates.js';

export function init() {
  selectElement('[data-slot="dashboard-link"]').innerHTML = dashboardLinkTemplate();
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    selectElement('[data-slot="dashboard-link"]').innerHTML = '';
  });
}
```

- [ ] **Step 7: Update exchange/index.js**

Replace:
```js
import * as recipientSearch from "./components/RecipientSearch.js";
import * as reuseLink from "./components/ReuseLink.js";
```
with:
```js
import * as dashboardLink from "./components/DashboardLink.js";
```

In `main()`, replace:
```js
  recipientSearch.init();
  reuseLink.init();
```
with:
```js
  dashboardLink.init();
```

- [ ] **Step 8: Update vitePrerenderPlugin.js**

Replace the slot injection imports and code. Change:
```js
import {introTemplate, recipientSearchTemplate, reuseLinkTemplate} from "./exchange/firstScreenTemplates.js";
```
to:
```js
import {introTemplate, dashboardLinkTemplate} from "./exchange/firstScreenTemplates.js";
```

In `injectSlots`, remove the two old replacements and add:
```js
    .replace(
      '<div data-slot="dashboard-link"></div>',
      `<div data-slot="dashboard-link">${dashboardLinkTemplate()}</div>`
    )
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/DashboardLink.spec.js`
Expected: PASS

- [ ] **Step 10: Update vitePrerenderPlugin.spec.js**

Update assertions to check for `data-slot="dashboard-link"` instead of `data-slot="recipient-search"` and `data-slot="reuse-link"`.

- [ ] **Step 11: Run all exchange tests**

Run: `npx vitest run spec/exchange/ spec/vitePrerenderPlugin.spec.js`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add index.html src/exchange/components/DashboardLink.js src/exchange/firstScreenTemplates.js src/exchange/index.js src/vitePrerenderPlugin.js spec/exchange/components/DashboardLink.spec.js spec/vitePrerenderPlugin.spec.js
git commit -m "feat: replace RecipientSearch + ReuseLink with DashboardLink on home page"
```

---

## Task 10: Delete Old Pages and Components

**Files:**
- Delete: `pages/wishlist/edit/index.html`
- Delete: `pages/wishlist/view/index.html`
- Delete: `pages/reuse/index.html`
- Delete: `src/reuse.js`
- Delete: `src/wishlistView.js`
- Delete: `src/wishlistEdit/` (entire directory)
- Delete: `src/exchange/components/RecipientSearch.js`
- Delete: `src/exchange/components/ReuseLink.js`
- Delete: `spec/wishlistEdit/` (entire directory)
- Delete: `spec/exchange/components/RecipientSearch.spec.js`
- Delete: `spec/exchange/components/ReuseLink.spec.js`
- Delete: `spec/reuse.spec.js`
- Delete: `spec/wishlistView.spec.js`

- [ ] **Step 1: Delete old page HTML files**

```bash
rm pages/wishlist/edit/index.html
rm pages/wishlist/view/index.html
rm pages/reuse/index.html
```

- [ ] **Step 2: Delete old source files**

```bash
rm src/reuse.js
rm src/wishlistView.js
rm -rf src/wishlistEdit/
rm src/exchange/components/RecipientSearch.js
rm src/exchange/components/ReuseLink.js
```

- [ ] **Step 3: Delete old test files**

```bash
rm -rf spec/wishlistEdit/
rm spec/exchange/components/RecipientSearch.spec.js
rm spec/exchange/components/ReuseLink.spec.js
rm spec/reuse.spec.js
rm spec/wishlistView.spec.js
```

- [ ] **Step 4: Check for remaining references to deleted files**

Search for imports of the deleted modules:
```bash
grep -r "wishlistEdit\|RecipientSearch\|ReuseLink\|reuse\.js\|wishlistView" src/ spec/ --include="*.js" --include="*.mjs" -l
```

Fix any remaining references.

- [ ] **Step 5: Run all tests to verify nothing is broken**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove old wishlist edit, wishlist view, reuse, and recipient search pages"
```

---

## Task 11: Update Email Templates and Links

**Files:**
- Modify: `netlify/shared/emails/secretSanta.mjs`
- Modify: `netlify/shared/links.mjs`

- [ ] **Step 1: Update secretSanta.mjs**

Change the help text in `secretSanta.mjs` from:
```
If you lose this email, you can enter your email on <a href="https://gift-exchange-generator.com/">gift-exchange-generator.com</a> to get a verification code and look up your recipient.
```
to:
```
If you lose this email, head to your <a href="https://gift-exchange-generator.com/dashboard" style="color: #69292a;">Participant Dashboard</a> to look up your recipient, view wishlists, and more.
```

- [ ] **Step 2: Verify wishlistLink.mjs and wishlistNotification.mjs**

Check `netlify/shared/emails/wishlistLink.mjs` and `wishlistNotification.mjs`. These templates currently render text but no clickable links to the old pages, so no URL changes are needed. Verify this is still the case and note in commit message that no changes were required.

- [ ] **Step 3: Update links.mjs**

Update the path helpers:

```js
export function dashboardPath() {
    return "/dashboard";
}

export function dashboardWishlistPath() {
    return "/dashboard#wishlist";
}

export function absoluteUrl(path) {
    return `${process.env.URL}${path}`;
}
```

- [ ] **Step 4: Run backend tests**

Run: `npx vitest run spec/netlify-functions/`
Expected: PASS (email templates are tested via snapshots or render checks)

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/emails/secretSanta.mjs netlify/shared/links.mjs
git commit -m "feat: update email templates to link to participant dashboard"
```

---

## Task 12: Update E2E Tests

**Files:**
- Modify: `e2e/edit-wishlist.spec.js`
- Modify: `e2e/reuse-exchange.spec.js`
- Modify: `e2e/recipient-search.spec.js`

- [ ] **Step 1: Read current E2E tests**

Read all three files to understand current navigation and assertions.

- [ ] **Step 2: Update edit-wishlist.spec.js**

Change navigation from `/wishlist/edit` to `/dashboard`. Update assertions to account for the collapsible section (may need to click "Your Wishlist" to expand before interacting with wishlist inputs).

- [ ] **Step 3: Update reuse-exchange.spec.js**

Change navigation from `/reuse` to `/dashboard`. Update to expand "Reuse a Past Exchange" collapsible before interacting.

- [ ] **Step 4: Update recipient-search.spec.js**

Change from navigating to home page and using inline auth gate to navigating to `/dashboard` and using the dashboard auth flow.

- [ ] **Step 5: Run E2E tests**

Run: `npx playwright test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add e2e/
git commit -m "test: update e2e tests for participant dashboard"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run all unit tests**

Run: `npx vitest run`
Expected: PASS — all tests green

- [ ] **Step 2: Run E2E tests**

Run: `npx playwright test`
Expected: PASS

- [ ] **Step 3: Manual smoke test**

Start dev server: `npx netlify dev`
- Visit `/` — verify DashboardLink appears with fun description, disappears when exchange is started
- Click dashboard link → navigate to `/dashboard`
- Verify loading spinner → auth gate flow
- After auth: verify recipient card, collapsible sections
- Test each collapsible section expands/collapses
- Test wishlist editing within dashboard
- Test recipient wishlist viewing
- Test reuse exchange flow
- Test mobile viewport

- [ ] **Step 4: Final commit if any fixes needed**
