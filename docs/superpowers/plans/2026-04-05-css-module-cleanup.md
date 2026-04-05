# CSS Module/Global Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up the CSS module/global boundary — convert component-specific global CSS to modules, extract shared utility classes, eliminate `:global()` overuse, and delete dead CSS.

**Architecture:** Move `.show`/`.hide`/`.hidden` utilities to `shared-base.css`, convert snackbar/cookie-banner/user-badge to CSS modules, create a shared `participant-card.module.css` for the House/NameList card styles, and clean up the household module's `:global()` usage by moving layout concerns to the proper global files.

**Tech Stack:** Vite CSS Modules, vanilla JS, Vitest + jsdom

---

### Task 1: Move visibility utilities to `shared-base.css` and convert snackbar to module

**Files:**
- Modify: `assets/styles/base/shared-base.css`
- Create: `assets/styles/components/snackbar.module.css`
- Delete: `assets/styles/components/snackbar.css`
- Modify: `assets/styles/main.css`
- Modify: `src/Snackbar.js`
- Modify: `index.html`
- Modify: `pages/dashboard/index.html`
- Modify: `spec/Snackbar.spec.js`
- Modify: `spec/shared/specHelper.js`

- [ ] **Step 1: Update the Snackbar test to expect init() creates the element**

The snackbar element currently exists in HTML. After this change, `init()` creates it. Update `spec/Snackbar.spec.js`:

Replace the `beforeAll` and `beforeEach`:
```javascript
beforeAll(() => {
  snackbar.init();
});

beforeEach(() => {
  bar = document.querySelector("#snackbar");
  bar.textContent = "";
  bar.className = "hidden";
  bar.style.color = "";
  bar.style.border = "";
  bar.style.background = "";
  vi.useFakeTimers();
});
```

With:
```javascript
beforeEach(() => {
  document.querySelector("#snackbar")?.remove();
  snackbar.init();
  bar = document.querySelector("#snackbar");
  vi.useFakeTimers();
});
```

This removes any existing snackbar, calls `init()` which creates a fresh one, then grabs the reference. No need to manually reset styles since we get a fresh element each time.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/Snackbar.spec.js`
Expected: Tests fail because `init()` doesn't create the element yet — it still does `document.querySelector("#snackbar")`.

- [ ] **Step 3: Move visibility utilities to `shared-base.css`**

Add to the end of `assets/styles/base/shared-base.css`:

```css
/* Visibility utility classes */
.show {
  visibility: visible;
  animation: fadein 0.5s;
}

.hide {
  animation: fadeout 0.5s;
}

.hidden {
  visibility: hidden;
}

@keyframes fadein {
  from { top: 0; opacity: 0; }
  to { top: 20px; opacity: 1; }
}

@keyframes fadeout {
  from { top: 20px; opacity: 1; }
  to { top: 0; opacity: 0; }
}
```

- [ ] **Step 4: Create `snackbar.module.css`**

Create `assets/styles/components/snackbar.module.css`:

```css
.snackbar {
  min-width: 250px;
  text-align: center;
  border-radius: 10px;
  padding: 16px;
  position: fixed;
  z-index: 100;
  left: 50%;
  transform: translateX(-50%);
  top: 20px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

- [ ] **Step 5: Update `Snackbar.js` to create element and use module**

Replace `src/Snackbar.js`:

```javascript
import styles from '../assets/styles/components/snackbar.module.css';

let bar;

export function init() {
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'snackbar';
    bar.className = `${styles.snackbar} hidden`;
    document.body.appendChild(bar);
  }
  const snackbarError = sessionStorage.getItem("snackbarError");
  if (snackbarError) {
    sessionStorage.removeItem("snackbarError");
    showError(snackbarError);
  }
}

export function showError(message) {
  bar.style.color = "#fff";
  bar.style.border = "1px solid rgba(200, 60, 60, 0.4)";
  bar.style.background = "rgba(140, 30, 30, 0.9)";
  showMessage(message);
}

export function showSuccess(message) {
  bar.style.color = "#fff";
  bar.style.border = "1px solid rgba(44, 184, 24, 0.4)";
  bar.style.background = "rgba(25, 140, 10, 0.9)";
  showMessage(message);
}

function showMessage(message) {
  bar.textContent = message;
  bar.classList.replace("hidden", "show");

  setTimeout(() => {
    bar.classList.add("hide");
  }, 5000);

  setTimeout(() => {
    bar.classList.replace("show", "hidden");
    bar.classList.remove("hide");
  }, 5500);
}
```

- [ ] **Step 6: Remove snackbar div from HTML files**

In `index.html`, remove line 23:
```html
<div id="snackbar" class="hidden"></div>
```

In `pages/dashboard/index.html`, remove line 10:
```html
<div id="snackbar" class="hidden"></div>
```

- [ ] **Step 7: Delete old `snackbar.css` and update `main.css`**

Delete `assets/styles/components/snackbar.css`.

In `assets/styles/main.css`, remove:
```css
@import './components/snackbar.css';
```

- [ ] **Step 8: Update `specHelper.js` snackbar init**

In `spec/shared/specHelper.js`, the `initReactiveSystem()` function (line 21) and `resetDOM()` function (line 122) call `snackbar.init()`. Since `init()` now creates the element if it doesn't exist, these should still work. However, `resetDOM()` replaces the entire document with `indexHtml` — which no longer contains the snackbar div. Since `init()` creates it, `resetDOM` just needs to call `init()` after rewriting the DOM, which it already does. No changes needed.

Verify by checking that `shouldDisplayErrorSnackbar` and `shouldDisplaySuccessSnackbar` in specHelper still find the element via `document.querySelector("#snackbar")` — they do, and `init()` creates it with `id="snackbar"`.

- [ ] **Step 9: Run all tests**

Run: `npx vitest run`
Expected: All 838 tests pass.

- [ ] **Step 10: Commit**

```bash
git add assets/styles/ src/Snackbar.js index.html pages/dashboard/index.html spec/Snackbar.spec.js
git commit -m "refactor: convert snackbar to CSS module, move visibility utils to shared-base"
```

---

### Task 2: Convert `cookie-banner.css` → `cookie-banner.module.css`

**Files:**
- Create: `assets/styles/components/cookie-banner.module.css`
- Delete: `assets/styles/components/cookie-banner.css`
- Modify: `assets/styles/main.css`
- Modify: `src/CookieBanner.js`
- Modify: `spec/CookieBanner.spec.js`

- [ ] **Step 1: Read `spec/CookieBanner.spec.js` to understand what tests assert**

Read the test file to identify any class name assertions that need updating.

- [ ] **Step 2: Create `cookie-banner.module.css`**

Create `assets/styles/components/cookie-banner.module.css`:

```css
.banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
  background: rgba(21, 8, 8, 0.92);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid var(--frost-border);
  padding: 14px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  animation: cookieSlideUp 0.3s ease-out;
}

.banner.dismissing {
  animation: cookieSlideDown 0.3s ease-out forwards;
}

.message {
  display: flex;
  align-items: center;
  gap: 10px;
}

.text {
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0;
}

.logo {
  height: 40px;
  flex-shrink: 0;
  background: #ffdd00;
  border-radius: 4px;
  padding: 4px;
}

.buttons {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn {
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
  font-family: inherit;
}

.btnReject {
  background: var(--burgundy);
  color: var(--text-primary);
  border: 1px solid var(--frost-border);
}

.btnReject:hover {
  background: var(--burgundy-light);
}

.btnAccept {
  background: var(--green);
  color: var(--text-primary);
  font-weight: bold;
}

.btnAccept:hover {
  filter: brightness(1.15);
}

@keyframes cookieSlideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}

@keyframes cookieSlideDown {
  from { transform: translateY(0); }
  to   { transform: translateY(100%); }
}

@media (max-width: 480px) {
  .banner {
    flex-direction: column;
    text-align: center;
    padding: 16px;
  }

  .buttons {
    width: 100%;
  }

  .btn {
    flex: 1;
    padding: 10px;
  }
}
```

- [ ] **Step 3: Update `CookieBanner.js` to use module**

Replace `src/CookieBanner.js` template and references:

```javascript
import styles from '../assets/styles/components/cookie-banner.module.css';

const CONSENT_KEY = "cookie-consent";
const bannerId = "cookie-banner";

function template() {
  return `<div id="${bannerId}" class="${styles.banner}">
    <div class="${styles.message}"><img class="${styles.logo}" src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="BMC"><p class="${styles.text}">This site uses a session cookie for authentication and optional cookies from <strong>Buy Me a Coffee</strong> to power the support widget. No tracking, no ads.</p></div>
    <div class="${styles.buttons}">
      <button class="${styles.btn} ${styles.btnReject}" id="cookie-reject">Reject</button>
      <button class="${styles.btn} ${styles.btnAccept}" id="cookie-accept">Accept</button>
    </div>
  </div>`;
}

function removeBanner() {
  const banner = document.querySelector(`#${bannerId}`);
  if (!banner) return;
  banner.classList.add(styles.dismissing);
  banner.addEventListener("animationend", () => banner.remove());
}
```

Keep all other functions (`accept`, `reject`, `attachListeners`, `isBmcConsented`, `init`, `loadBmcWidget`) unchanged.

- [ ] **Step 4: Delete old file and update `main.css`**

Delete `assets/styles/components/cookie-banner.css`.

In `assets/styles/main.css`, remove:
```css
@import './components/cookie-banner.css';
```

- [ ] **Step 5: Update tests if needed**

Check `spec/CookieBanner.spec.js` for any class name assertions and update them to use the module import.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add assets/styles/ src/CookieBanner.js spec/CookieBanner.spec.js
git commit -m "refactor: convert cookie-banner to CSS module"
```

---

### Task 3: Convert `user-badge.css` → `user-badge.module.css`

**Files:**
- Create: `assets/styles/components/user-badge.module.css`
- Delete: `assets/styles/components/user-badge.css`
- Modify: `assets/styles/base/shared-base.css`
- Modify: `assets/styles/main.css`
- Modify: `src/UserBadge.js`
- Modify: `spec/UserBadge.spec.js`

- [ ] **Step 1: Read `spec/UserBadge.spec.js` to understand test assertions**

Read the test file to identify any class name or ID assertions that need updating.

- [ ] **Step 2: Create `user-badge.module.css`**

Create `assets/styles/components/user-badge.module.css`:

```css
.badge {
    position: fixed;
    top: 12px;
    right: 16px;
    z-index: 10;
    background: var(--frost);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--frost-border);
    border-radius: 8px;
    padding: 6px 14px;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    gap: 10px;
    strong {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 600;
    }
}

.logout {
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    font-size: 0.75rem;
    transition: color 0.15s;
    &:hover {
        color: rgba(255, 255, 255, 0.9);
    }
}

@media screen and (max-width: 499px) {
    .badge {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        border-radius: 0;
        border-left: none;
        border-right: none;
        border-top: none;
        padding: 10px 16px;
        font-size: 0.85rem;
        justify-content: center;
        gap: 12px;
    }
    .logout {
        font-size: 0.85rem;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
    }
}
```

- [ ] **Step 3: Move `body:has(#user-badge)` to `shared-base.css`**

Add to `assets/styles/base/shared-base.css`:

```css
/* User badge body padding for mobile */
@media screen and (max-width: 499px) {
  body:has(#user-badge) {
    padding-top: 44px;
  }
}
```

- [ ] **Step 4: Update `UserBadge.js` to use module**

Replace `src/UserBadge.js`:

```javascript
import {getSessionUser, clearSession} from "./session.js";
import {escape} from "./utils.js";
import styles from '../assets/styles/components/user-badge.module.css';

const badgeId = "user-badge";

export function init() {
    const user = getSessionUser();
    if (!user) return;

    remove();

    const html = `<div id="${badgeId}" class="${styles.badge}">
        <span><span class="user-badge-prefix">Logged in as </span><strong>${escape(user.name)}</strong></span>
        <a class="${styles.logout}" id="${badgeId}-logout" href="#">Log out</a>
    </div>`;
    document.body.insertAdjacentHTML("beforeend", html);

    document.getElementById(`${badgeId}-logout`).addEventListener("click", async (e) => {
        e.preventDefault();
        await fetch("/.netlify/functions/api-auth-logout-post", {method: "POST"});
        clearSession();
        remove();
    });
}

export function remove() {
    document.getElementById(badgeId)?.remove();
}
```

- [ ] **Step 5: Delete old file and update `main.css`**

Delete `assets/styles/components/user-badge.css`.

In `assets/styles/main.css`, remove:
```css
@import './components/user-badge.css';
```

- [ ] **Step 6: Update tests if needed**

Check `spec/UserBadge.spec.js` for ID or class assertions. The `id="user-badge"` stays, so `#user-badge` selectors in tests still work. Update any assertions on `#user-badge-logout` to `#user-badge-logout` (ID unchanged).

- [ ] **Step 7: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add assets/styles/ src/UserBadge.js spec/UserBadge.spec.js
git commit -m "refactor: convert user-badge to CSS module"
```

---

### Task 4: Create `participant-card.module.css` and clean up `household.module.css`

**Files:**
- Create: `assets/styles/exchange/components/participant-card.module.css`
- Modify: `assets/styles/exchange/components/household.module.css`
- Delete: `assets/styles/exchange/components/participants.module.css`
- Modify: `assets/styles/exchange/base.css`
- Modify: `assets/styles/exchange/layout.css`
- Modify: `assets/styles/exchange/responsive.css`
- Modify: `src/exchange/components/House.js`
- Modify: `src/exchange/components/NameList.js`
- Modify: `src/exchange/components/Select.js`
- Modify: `src/exchange/dragDrop.js`
- Modify: Multiple test files

- [ ] **Step 1: Create `participant-card.module.css`**

Create `assets/styles/exchange/components/participant-card.module.css`:

```css
.card {
  min-height: 5rem;
  background: var(--frost);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--frost-border);
  border-radius: var(--radius-lg);
  padding: 1rem;
  max-width: 347px;
  box-shadow: var(--shadow-card);
}

.card p {
  margin: 5px;
  display: inline-block;
}

.card h2 {
  margin-top: 0;
  margin-bottom: 10px;
}

.header {
  margin-top: 0;
}

.nameContainer {
  min-height: 3rem;
  padding-bottom: 10px;
}

.nameSelect {
  width: 100%;
  margin-top: 15px;
}

.nameInput {
  text-transform: capitalize;
  width: calc(100% - 165px);
}
```

- [ ] **Step 2: Rewrite `household.module.css`**

Replace `assets/styles/exchange/components/household.module.css` with only household-specific styles:

```css
.household {
  margin-top: 1rem;
}

.household .nameContainer:empty {
  min-height: 3rem;
}
```

Note: `.nameContainer` here refers to the class from `participant-card.module.css`. Since it's a different module, this selector won't match the scoped name. Instead, use the `data-slot` attribute that's already on name containers:

```css
.household {
  margin-top: 1rem;
}

.household [data-slot^="names-"]:empty {
  min-height: 3rem;
}
```

- [ ] **Step 3: Move `#name-list` global styles to `exchange/base.css`**

Add to end of `assets/styles/exchange/base.css`:

```css
/* Name list overrides */
#name-list {
  margin-top: 0;
}

#name-list input,
#name-list select {
  padding: 5px 10px;
}
```

- [ ] **Step 4: Move secret-mode household layout rules to `exchange/layout.css`**

The household module currently has `:global(#left-container.secret) .household` rules. These are layout concerns. However, since `.household` is a scoped module class, we can't reference it from a global file directly.

Instead, add these rules using the `[data-testid="household"]` attribute that's already on household elements:

Add to `assets/styles/exchange/layout.css` after the existing `#left-container.secret` block:

```css
#left-container.secret [data-testid="household"] {
  width: 333px;
  margin: 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

#left-container.secret [data-testid="household"] [data-slot^="names-"] {
  flex: 1;
}

#left-container.secret [data-testid="household"] select {
  width: 100%;
}
```

- [ ] **Step 5: Move secret-mode household responsive rules to `exchange/responsive.css`**

In `assets/styles/exchange/responsive.css`, within the `@media screen and (max-width: 723px)` block, add:

```css
  #left-container.secret [data-testid="household"] {
    width: auto;
    max-width: 347px;
    margin: 0 auto 12px;
  }
```

Within the `@media screen and (max-width: 630px)` block, add:

```css
  #left-container.secret [data-testid="household"] {
    max-width: 320px;
  }
```

Also in the 630px block, replace the `#name-list` responsive rules. The current `exchange/responsive.css` has:
```css
  #left-container.secret {
    #name-list {
      padding-bottom: 65px;
      & select {
        margin-top: 20px;
      }
    }
  }
```
This stays as-is since it targets `#name-list` (a global ID).

Add the `.card` responsive override. Since `.card` is a scoped module class we can't reference from global CSS, use the `#name-list` ID and `[data-testid="household"]` attribute:

In the 630px block, replace:
```css
  .household,
  :global(#name-list) {
    margin: 0 auto 12px;
    max-width: 320px;
  }

  .household h2,
  :global(#name-list) h2 {
    text-align: center;
  }
```

These were in `household.module.css` — they need to go in `exchange/responsive.css`. Use the attribute selector for household and the ID for name-list:

```css
  #name-list,
  [data-testid="household"] {
    margin: 0 auto 12px;
    max-width: 320px;
  }

  #name-list h2,
  [data-testid="household"] h2 {
    text-align: center;
  }
```

- [ ] **Step 6: Update `House.js`**

In `src/exchange/components/House.js`:

Add import:
```javascript
import cardStyles from '../../../assets/styles/exchange/components/participant-card.module.css';
```

Update template (line 33):
```javascript
      <div class="${cardStyles.card} ${houseStyles.household} card-slide-slow" id="${houseID}" data-testid="household">
```

Update nameContainer reference (line 35):
```javascript
        <div data-slot="names-${houseID}" class="${cardStyles.nameContainer}">
```

- [ ] **Step 7: Update `NameList.js`**

In `src/exchange/components/NameList.js`:

Replace:
```javascript
import houseStyles from '../../../assets/styles/exchange/components/household.module.css';
import partStyles from '../../../assets/styles/exchange/components/participants.module.css';
```

With:
```javascript
import cardStyles from '../../../assets/styles/exchange/components/participant-card.module.css';
```

Update template:
- Line 35: `<div id="${nameListId}" style="display: none;">` → `<div id="${nameListId}" class="${cardStyles.card}" style="display: none;">`
- Line 36: `class="${houseStyles.house1Header}"` → `class="${cardStyles.header}"`
- Line 38: `class="${houseStyles.nameContainer}"` → `class="${cardStyles.nameContainer}"`
- Line 40: `class="${partStyles.nameInput}"` → `class="${cardStyles.nameInput}"`
- Line 42: `class="${houseStyles.nameSelect}"` → `class="${cardStyles.nameSelect}"`

- [ ] **Step 8: Update `Select.js`**

In `src/exchange/components/Select.js`:

Replace:
```javascript
import houseStyles from '../../../assets/styles/exchange/components/household.module.css';
```

With:
```javascript
import houseStyles from '../../../assets/styles/exchange/components/household.module.css';
import cardStyles from '../../../assets/styles/exchange/components/participant-card.module.css';
```

Update references:
- Line 25: `houseStyles.household` stays (finding closest household)
- Line 29: `houseStyles.household` stays (finding closest household)
- Line 85: `houseStyles.nameSelect` → `cardStyles.nameSelect`

- [ ] **Step 9: Update `dragDrop.js`**

In `src/exchange/dragDrop.js`:

Replace:
```javascript
import houseStyles from '../../assets/styles/exchange/components/household.module.css';
```

With:
```javascript
import houseStyles from '../../assets/styles/exchange/components/household.module.css';
import cardStyles from '../../assets/styles/exchange/components/participant-card.module.css';
```

Update references:
- Line 36: `houseStyles.nameContainer` → `cardStyles.nameContainer`
- Lines 91, 96: `houseStyles.household` stays (finding closest household)

- [ ] **Step 10: Delete `participants.module.css`**

Delete `assets/styles/exchange/components/participants.module.css`.

- [ ] **Step 11: Update test files**

Update test imports from `houseStyles` to `cardStyles` where they reference shared classes:

**`spec/exchange/dragDrop.spec.js`:**
Add: `import cardStyles from '../../assets/styles/exchange/components/participant-card.module.css';`
Replace all `houseStyles.nameContainer` → `cardStyles.nameContainer`

**`spec/exchange/components/Name.spec.js`:**
Replace: `import houseStyles from '../../../assets/styles/exchange/components/household.module.css';`
With: `import cardStyles from '../../../assets/styles/exchange/components/participant-card.module.css';`
Replace: `houseStyles.nameSelect` → `cardStyles.nameSelect`

**`spec/exchange/components/House.spec.js`:**
Add: `import cardStyles from '../../../assets/styles/exchange/components/participant-card.module.css';`
Replace all `houseStyles.nameContainer` → `cardStyles.nameContainer`

- [ ] **Step 12: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 13: Commit**

```bash
git add assets/styles/ src/exchange/ spec/exchange/
git commit -m "refactor: create shared participant-card module, clean up household module"
```

---

### Task 5: Delete dead CSS rules

**Files:**
- Modify: `assets/styles/exchange/responsive.css`

- [ ] **Step 1: Remove `#input0` and `#b0` rules**

In `assets/styles/exchange/responsive.css`, remove lines 17-24:

```css
@media screen and (max-width: 673px) {
  #input0 {
    margin: 5px;
  }
  #b0 {
    margin-bottom: 0;
  }
}
```

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Build and verify**

Run: `npx vite build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add assets/styles/exchange/responsive.css
git commit -m "chore: remove dead #input0 and #b0 CSS rules"
```
