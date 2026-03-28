# CSS Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize CSS into a clear shared/exchange/dashboard structure, eliminate duplicate definitions, and delete dead snackbar code.

**Architecture:** Move exchange-specific component files into `components/exchange/`, extract dashboard styles from the `pages.css` monolith into `components/dashboard/` files, create a `base/shared-base.css` for common resets, scope page-specific base styles via `.exchange` and `.dashboard-page` classes, and rewire the entry point imports.

**Tech Stack:** Vite, native CSS `@import`

---

### Task 1: Create shared-base.css and directory structure

**Files:**
- Create: `src/css/base/shared-base.css`
- Create: `src/css/components/exchange/` (directory)
- Create: `src/css/components/dashboard/` (directory)

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p src/css/components/exchange src/css/components/dashboard
```

- [ ] **Step 2: Create src/css/base/shared-base.css**

```css
/* Shared base styles — common to all pages */

html {
  height: 100%;
  overscroll-behavior-y: none;
}

h1 {
  text-align: center;
}

@keyframes pageReveal {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/css/base/shared-base.css
git commit -m "refactor: add shared-base.css and page-scoped CSS directories"
```

---

### Task 2: Move exchange component files into components/exchange/

Move existing exchange-specific CSS files from `components/` and `base/` into `components/exchange/`.

**Files:**
- Move: `src/css/base/reset.css` → `src/css/components/exchange/base.css`
- Move: `src/css/base/layout.css` → `src/css/components/exchange/layout.css`
- Move: `src/css/components/buttons.css` → `src/css/components/exchange/buttons.css`
- Move: `src/css/components/participants.css` → `src/css/components/exchange/participants.css`
- Move: `src/css/components/household.css` → `src/css/components/exchange/household.css`
- Move: `src/css/components/table.css` → `src/css/components/exchange/table.css`
- Move: `src/css/components/email-dialog.css` → `src/css/components/exchange/email-dialog.css`
- Move: `src/css/components/email-confirmation.css` → `src/css/components/exchange/email-confirmation.css`
- Move: `src/css/components/recipient-search.css` → `src/css/components/exchange/recipient-search.css`
- Move: `src/css/responsive.css` → `src/css/components/exchange/responsive.css`

- [ ] **Step 1: Move the files**

```bash
mv src/css/base/reset.css src/css/components/exchange/base.css
mv src/css/base/layout.css src/css/components/exchange/layout.css
mv src/css/components/buttons.css src/css/components/exchange/buttons.css
mv src/css/components/participants.css src/css/components/exchange/participants.css
mv src/css/components/household.css src/css/components/exchange/household.css
mv src/css/components/table.css src/css/components/exchange/table.css
mv src/css/components/email-dialog.css src/css/components/exchange/email-dialog.css
mv src/css/components/email-confirmation.css src/css/components/exchange/email-confirmation.css
mv src/css/components/recipient-search.css src/css/components/exchange/recipient-search.css
mv src/css/responsive.css src/css/components/exchange/responsive.css
```

- [ ] **Step 2: Verify**

```bash
ls src/css/components/exchange/
```

Expected: `base.css buttons.css email-confirmation.css email-dialog.css household.css layout.css participants.css recipient-search.css responsive.css table.css`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move exchange-specific CSS into components/exchange/"
```

---

### Task 3: Scope exchange base styles with .exchange class

Remove the shared bits (now in `shared-base.css`) from `components/exchange/base.css` and scope the exchange-specific `#container` styles to `.exchange`.

**Files:**
- Modify: `src/css/components/exchange/base.css`
- Modify: `index.html:26`

- [ ] **Step 1: Update exchange base.css**

Replace the entire contents of `src/css/components/exchange/base.css` with:

```css
/* Exchange page base styles */

html {
  font-family: Arial, Helvetica, sans-serif;
}

body {
  overscroll-behavior-y: none;
  color: rgb(255, 255, 255);
  margin-right: 0;
  max-width: 100%;
  padding-bottom: 100px;
}

#container.exchange {
  margin-right: 8px;
  animation: pageReveal 0.6s ease-out;
}

#background {
  width: 100%;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
  background-image: linear-gradient(
      rgba(43, 43, 43, 0.60) 80%,
      rgba(0, 0, 0, 0.90)
    ),
    url(/Gift-Giving-Banner.webp);
  background-size: cover;
}

#intro {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  line-height: 1.5em;
  padding: 5px 10px;
  margin: 10px auto;
  text-align: justify;
  max-width: 600px;
}

.dashboardLink {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  padding: 15px 10px;
  margin: 0 auto;
  text-align: center;
  max-width: 600px;
}

.dashboardLink-btn {
  text-decoration: none;
  width: auto;
  padding: 14px 28px;
  font-size: 1rem;
}

.dashboardLink-desc {
  margin: 0 0 12px;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
}

.ghost-text {
  color: rgba(255, 255, 255, 0.45);
  font-style: italic;
  font-size: 1em;
  text-align: center;
  padding: 4px 8px;
  line-height: 1.5;
}

.ghost-house {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 2px dashed rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 20px 16px;
  margin-top: 1rem;
  margin-bottom: 12px;
  max-width: 347px;
  text-align: center;
}

.ghost-house .ghost-house-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 8px 20px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s;
}

.ghost-house .ghost-house-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
}

.ghost-house-minimal {
  background: rgba(255, 255, 255, 0.02);
  border-color: rgba(255, 255, 255, 0.08);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.name-wrapper {
  cursor: grab;
}

body.dragging,
body.dragging * {
  cursor: grabbing !important;
}

.dragging-source {
  visibility: hidden;
  height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  overflow: hidden;
}

@keyframes slideOutLeft {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-40px); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}

.slide-out-left { animation: slideOutLeft 0.3s ease-in forwards; }
.slide-in-right { animation: slideInRight 0.3s ease-out both; }

.drop-preview {
  display: flex;
  height: 36px;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 6px;
}
```

Note: `html { height: 100%; overscroll-behavior-y: none }`, `h1 { text-align: center }`, and `@keyframes pageReveal` have been removed — they're now in `shared-base.css`. The `#container` rule is scoped to `#container.exchange`.

- [ ] **Step 2: Add .exchange class to index.html**

In `index.html`, change line 26 from:

```html
<div id="container">
```

to:

```html
<div id="container" class="exchange">
```

- [ ] **Step 3: Commit**

```bash
git add src/css/components/exchange/base.css index.html
git commit -m "refactor: scope exchange base styles to .exchange class"
```

---

### Task 4: Extract dashboard component files from pages.css

Break apart `src/css/pages.css` into individual component files under `components/dashboard/`.

**Files:**
- Create: `src/css/components/dashboard/base.css`
- Create: `src/css/components/dashboard/buttons.css`
- Create: `src/css/components/dashboard/cards.css`
- Create: `src/css/components/dashboard/sidebar.css`
- Create: `src/css/components/dashboard/wishlist.css`
- Create: `src/css/components/dashboard/auth-gate.css`
- Create: `src/css/components/dashboard/recipient-card.css`
- Create: `src/css/components/dashboard/modal.css`
- Create: `src/css/components/dashboard/responsive.css`
- Delete: `src/css/pages.css`

- [ ] **Step 1: Create src/css/components/dashboard/base.css**

```css
/* Dashboard page base styles */

html {
  font-family: 'Source Sans 3', 'Segoe UI', sans-serif;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  color: var(--text-primary);
  background: var(--burgundy-deep);
  background-image: radial-gradient(ellipse at 30% 0%, rgba(90, 35, 36, 0.25) 0%, transparent 50%);
  background-attachment: fixed;
}

#container.dashboard-page {
  max-width: 620px;
  margin: 0 auto;
  padding: 40px 24px 60px;
  animation: pageReveal 0.6s ease-out;
}

h1 {
  font-family: 'Source Sans 3', 'Georgia', serif;
  font-weight: 700;
  font-size: 2rem;
  color: #fff;
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

h2 {
  font-family: 'Source Sans 3', 'Georgia', serif;
  font-weight: 600;
  font-size: 1.25rem;
  color: #fff;
  margin: 0 0 4px;
  letter-spacing: 0.01em;
}

.helper-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 16px;
  font-weight: 300;
}

hr {
  border: none;
  height: 1px;
  background: var(--frost-border);
  margin: 8px 0 20px;
}

/* Form input overrides (dashboard pages) */
select,
input[type="email"],
input[type="url"],
input[type="text"],
input[type="tel"],
input[type="number"],
textarea {
  width: 100%;
  margin-bottom: 10px;
}

/* Back link */
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 24px;
  transition: color 0.15s;
}

.back-link:hover {
  color: rgba(255, 255, 255, 0.9);
}

.back-link::before {
  content: '\2190';
  font-size: 1.1em;
}

/* Empty state */
.empty-state {
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  margin-top: 16px;
}

/* Search section (Reuse page) */
#search-section {
  text-align: center;
}

#search-section label {
  text-transform: none;
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-secondary);
  letter-spacing: 0;
  margin-bottom: 16px;
}

#search-section input {
  max-width: 360px;
  margin: 0 auto 12px;
  text-align: center;
}

/* Contact section spacing */
#contact-section label {
  margin-top: 12px;
}

#contact-section label:first-of-type {
  margin-top: 0;
}
```

- [ ] **Step 2: Create src/css/components/dashboard/buttons.css**

```css
/* Dashboard button styles */

.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 22px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-family: 'Source Sans 3', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  width: auto;
  max-height: none;
  margin: 0;
  background: #69292a;
  color: rgba(255, 255, 255, 0.9);
}

.button:hover {
  background: #7a3233;
}

.button:active {
  background: #5a2122;
}

.button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.button.primary {
  font-size: 1rem;
  padding: 12px 32px;
  width: 100%;
  margin-top: 8px;
}

.button.primary:hover {
  background: #7a3233;
}
```

- [ ] **Step 3: Create src/css/components/dashboard/cards.css**

```css
/* Glass card sections */

section, #search-section {
  background: var(--frost);
  border: 1px solid var(--frost-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 20px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--shadow-card);
  animation: cardSlide 0.5s ease-out both;
}

section:nth-child(2) { animation-delay: 0.08s; }
section:nth-child(3) { animation-delay: 0.16s; }
section:nth-child(4) { animation-delay: 0.24s; }

/* Exchange results (Reuse page) */
#results-section {
  margin-top: 20px;
}

.exchange-result {
  background: var(--frost);
  border: 1px solid var(--frost-border);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  animation: cardSlide 0.4s ease-out both;
}

.exchange-result:hover {
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.exchange-result h3 {
  font-family: 'Source Sans 3', sans-serif;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
  font-size: 1.15rem;
}

.exchange-result p {
  margin: 4px 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.exchange-result p strong {
  color: var(--text-primary);
  font-weight: 600;
}

.exchange-result .button {
  margin-top: 12px;
}
```

- [ ] **Step 4: Create src/css/components/dashboard/sidebar.css**

```css
/* Dashboard sidebar layout */

#container.dashboard-page {
  max-width: none;
  padding: 0;
  margin: 0;
}

.dashboard-page .back-link,
.dashboard-page h1 {
  display: none;
}

.dashboard-layout {
  min-height: 100vh;
  margin-left: 220px;
}

.dashboard-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
  border-right: 1px solid var(--frost-border);
  padding: 24px 0;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  overflow-y: auto;
}

.sidebar-title {
  padding: 0 20px 20px;
  font-family: 'Source Sans 3', 'Georgia', serif;
  font-weight: 700;
  font-size: 1.15rem;
  color: #fff;
  letter-spacing: -0.01em;
}

.sidebar-welcome {
  padding: 0 20px 16px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
}

.nav-item {
  display: block;
  padding: 10px 20px;
  font-size: 0.9rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-left: 3px solid transparent;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
  cursor: pointer;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-primary);
}

.nav-item.active {
  background: rgba(255, 255, 255, 0.06);
  border-left-color: var(--burgundy);
  color: var(--text-primary);
  font-weight: 600;
}

.sidebar-back {
  display: block;
  padding: 10px 20px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-top: 1px solid var(--frost-border);
  margin-top: 12px;
  padding-top: 14px;
  transition: color 0.15s;
}

.sidebar-back:hover {
  color: var(--text-primary);
}

.sidebar-logout {
  display: block;
  padding: 10px 20px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-decoration: none;
  border-top: 1px solid var(--frost-border);
  margin-top: auto;
  position: absolute;
  bottom: 24px;
  left: 0;
  right: 0;
  transition: color 0.15s;
}

.sidebar-logout:hover {
  color: var(--text-primary);
}

.hamburger-logout {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s;
}

.hamburger-logout:hover {
  color: var(--text-primary);
}

.dashboard-main {
  max-width: 620px;
  margin: 0 auto;
  padding: 40px 32px 60px;
}

.dashboard-section {
  animation: cardSlide 0.5s ease-out both;
}

.dashboard-section section {
  box-shadow: none;
  border: none;
  padding: 0;
  margin-bottom: 20px;
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  animation: none;
}

/* Hamburger (mobile only) */
.hamburger-bar {
  display: none;
}

.hamburger-btn {
  background: var(--frost);
  border: 1px solid var(--frost-border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 1.4rem;
  padding: 6px 12px;
  cursor: pointer;
  line-height: 1;
}

.sidebar-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.sidebar-backdrop.open {
  display: block;
}
```

- [ ] **Step 5: Create src/css/components/dashboard/wishlist.css**

```css
/* Wishlist add-form row (URL + Title + Button) */

#add-wishlist-form,
#add-item-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: start;
}

#add-item-form {
  grid-template-columns: 1fr auto auto;
}

#add-item-form .item-form-url {
  grid-column: 1 / -1;
}

#add-wishlist-form input,
#add-item-form input {
  margin-bottom: 0;
}

#add-wishlist-form label,
#add-item-form label {
  margin-bottom: 2px;
}

#add-wishlist-form .button,
#add-item-form .button {
  height: 40px;
  padding: 0 16px;
  white-space: nowrap;
  align-self: end;
}

/* Item price */
.item-price {
  color: var(--text-secondary);
  font-size: 0.9rem;
  white-space: nowrap;
  margin-right: 12px;
}

#item-price {
  width: 100px;
}

/* Wishlist entries */
.wishlist-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  margin-bottom: 8px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}

.wishlist-entry:hover {
  background: rgba(0, 0, 0, 0.3);
}

.wishlist-entry a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.3);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 12px;
  transition: color 0.15s;
}

.wishlist-entry a:hover {
  color: #fff;
}

/* Wishlist view page */
#wishlist-content {
  animation: cardSlide 0.5s ease-out 0.1s both;
}

#wishlist-content h2 {
  margin-top: 24px;
}

#wishlist-content h2:first-child {
  margin-top: 0;
}

#wishlist-content ul {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
}

#wishlist-content li {
  padding: 10px 14px;
  margin-bottom: 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}

#wishlist-content li:hover {
  background: rgba(0, 0, 0, 0.3);
}

#wishlist-content a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}

#wishlist-content a:hover {
  color: #fff;
  text-decoration: underline;
}

#wishlist-content p {
  text-align: center;
  color: var(--text-secondary);
  font-style: italic;
  margin-top: 32px;
}
```

- [ ] **Step 6: Create src/css/components/dashboard/auth-gate.css**

```css
/* Auth gate */

#auth-gate {
  max-width: 400px;
  margin: 60px auto 0;
  background: var(--frost);
  border: 1px solid var(--frost-border);
  border-radius: var(--radius-lg);
  padding: 24px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: var(--shadow-card);
  animation: cardSlide 0.5s ease-out both;
  h2 {
    margin-top: 0;
    margin-bottom: 12px;
  }
}
```

- [ ] **Step 7: Create src/css/components/dashboard/recipient-card.css**

```css
/* Recipient card */

#recipient-card {
  text-align: left;
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
```

- [ ] **Step 8: Create src/css/components/dashboard/modal.css**

```css
/* Unsaved changes modal */

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease-out;
}

.modal-dialog {
  background: var(--burgundy-deep);
  border: 1px solid var(--frost-border);
  border-radius: var(--radius-lg);
  padding: 28px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
}

.modal-dialog h3 {
  font-family: 'Source Sans 3', 'Georgia', serif;
  font-weight: 600;
  font-size: 1.15rem;
  color: #fff;
  margin: 0 0 8px;
}

.modal-dialog p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 20px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-leave {
  background: transparent !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: var(--text-secondary) !important;
}

.modal-leave:hover {
  color: var(--text-primary) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

- [ ] **Step 9: Create src/css/components/dashboard/responsive.css**

```css
/* Dashboard responsive breakpoints */

@media screen and (max-width: 480px) {
  #container {
    padding: 24px 16px 48px;
  }

  h1 {
    font-size: 1.6rem;
  }

  section, #search-section {
    padding: 18px 16px;
  }

  #add-wishlist-form,
  #add-item-form {
    grid-template-columns: 1fr;
  }

  #add-item-form .item-form-url {
    grid-column: 1;
  }

  #item-price {
    width: 100%;
  }

  #add-wishlist-form .button,
  #add-item-form .button {
    width: 100%;
    height: auto;
    padding: 10px;
  }
}

@media screen and (max-width: 768px) {
  .dashboard-page {
    display: block;
  }

  .dashboard-layout {
    display: block;
  }

  .hamburger-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--frost-border);
    background: rgba(255, 255, 255, 0.04);
  }

  .hamburger-bar .dashboard-welcome {
    margin: 0;
    padding: 0;
    font-size: 0.85rem;
  }

  .dashboard-sidebar {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 260px;
    z-index: 20;
    border-radius: 0;
    border-right: 1px solid var(--frost-border);
    background: var(--burgundy-deep);
    overflow-y: auto;
    animation: slideIn 0.2s ease-out;
  }

  .dashboard-sidebar.open {
    display: block;
  }

  .dashboard-main {
    margin-left: 0;
    padding: 24px 16px 48px;
  }

  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
}
```

- [ ] **Step 10: Delete pages.css**

```bash
rm src/css/pages.css
```

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: extract dashboard CSS into component files"
```

---

### Task 5: Rewire entry point CSS files

Replace `main.css` with `exchange.css`, create `dashboard.css`, and update `all.css`.

**Files:**
- Delete: `src/css/main.css`
- Create: `src/css/exchange.css`
- Create: `src/css/dashboard.css`
- Modify: `src/css/all.css`

- [ ] **Step 1: Create src/css/exchange.css**

```css
/* Shared */
@import './base/tokens.css';
@import './base/forms.css';
@import './base/shared-base.css';

/* Shared Components */
@import './components/snackbar.css';
@import './components/entries.css';
@import './components/cookie-banner.css';
@import './components/user-badge.css';

/* Exchange */
@import './components/exchange/base.css';
@import './components/exchange/layout.css';
@import './components/exchange/buttons.css';
@import './components/exchange/participants.css';
@import './components/exchange/household.css';
@import './components/exchange/table.css';
@import './components/exchange/email-dialog.css';
@import './components/exchange/email-confirmation.css';
@import './components/exchange/recipient-search.css';
@import './components/exchange/responsive.css';

/* Themes */
@import './themes/secret-santa.css';
```

- [ ] **Step 2: Create src/css/dashboard.css**

```css
@import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600&display=swap');

/* Shared */
@import './base/tokens.css';
@import './base/forms.css';
@import './base/shared-base.css';

/* Shared Components */
@import './components/snackbar.css';
@import './components/entries.css';
@import './components/cookie-banner.css';

/* Dashboard */
@import './components/dashboard/base.css';
@import './components/dashboard/buttons.css';
@import './components/dashboard/cards.css';
@import './components/dashboard/sidebar.css';
@import './components/dashboard/wishlist.css';
@import './components/dashboard/auth-gate.css';
@import './components/dashboard/recipient-card.css';
@import './components/dashboard/modal.css';
@import './components/dashboard/responsive.css';
```

- [ ] **Step 3: Update src/css/all.css**

Replace contents with:

```css
@import './exchange.css';
@import './dashboard.css';
```

- [ ] **Step 4: Delete main.css**

```bash
rm src/css/main.css
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: rewire CSS entry points as exchange.css + dashboard.css"
```

---

### Task 6: Delete dead snackbar code

The `.success`/`.error` CSS classes in the old `pages.css` snackbar section were dead code. They were already excluded in Task 4 when extracting dashboard components (not included in any extracted file). Verify they're gone.

**Files:**
- Verify: no `.success` or `.error` CSS class selectors exist in `src/css/`

- [ ] **Step 1: Verify dead code was not carried over**

```bash
grep -r '\.success\|\.error' src/css/
```

Expected: no matches (or only unrelated matches like color values).

- [ ] **Step 2: Verify snackbar.css is unchanged**

Read `src/css/components/snackbar.css` and confirm it still contains only the `.show`/`.hide`/`.hidden` class definitions — the same content as before, no additions.

---

### Task 7: Build and verify

- [ ] **Step 1: Run the production build**

```bash
npx vite build
```

Expected: Build succeeds with no errors. Output shows a single CSS asset in `dist/assets/`.

- [ ] **Step 2: Verify the bundled CSS exists and contains styles from both pages**

```bash
ls dist/assets/*.css
```

Expected: exactly one `.css` file.

```bash
grep -o 'dashboard-sidebar' dist/assets/*.css | head -1
grep -o 'flex-div' dist/assets/*.css | head -1
grep -o 'burgundy-deep' dist/assets/*.css | head -1
```

Expected: all three found (dashboard, exchange, and shared styles present).

- [ ] **Step 3: Verify no dead snackbar code in bundle**

```bash
grep 'snackIn' dist/assets/*.css
```

Expected: no matches — the `snackIn` keyframe was part of the dead dashboard snackbar code.

- [ ] **Step 4: Verify CSS is injected into both HTML files**

```bash
grep 'stylesheet' dist/index.html dist/dashboard/index.html
```

Expected: both HTML files contain a `<link rel="stylesheet">` tag.

- [ ] **Step 5: Verify .exchange class on exchange HTML**

```bash
grep 'class="exchange"' dist/index.html
```

Expected: the container div has the `.exchange` class.

- [ ] **Step 6: Commit all changes**

```bash
git add -A
git commit -m "feat: reorganize CSS into shared/exchange/dashboard structure"
```
