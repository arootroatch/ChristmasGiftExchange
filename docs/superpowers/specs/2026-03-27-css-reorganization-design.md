# CSS Reorganization Design

## Goal

Reorganize the CSS file structure so it's clear which styles are shared, which are exchange-specific, and which are dashboard-specific. Eliminate duplicate/conflicting definitions now that everything is bundled into a single file via Vite.

## Current Problems

1. **Confusing naming** — `main.css` is really exchange styles, `pages.css` is really dashboard styles, `all.css` is the actual entry point
2. **810-line monolith** — `pages.css` contains base styles, typography, buttons, sidebar, wishlist, modals, auth gate, responsive — all inline
3. **Duplicate `.button` definitions** — `components/buttons.css` (exchange) and `pages.css` (dashboard) both fully define `.button`
4. **Dead snackbar code** — `pages.css` defines `#snackbar` with `.success`/`.error` classes that are never used; `Snackbar.js` uses inline styles + `.show`/`.hide`/`.hidden` classes from `components/snackbar.css`
5. **Conflicting base styles** — `base/reset.css` and `pages.css` both define `html`, `body`, `#container`, `h1` with different values
6. **Misnamed file** — `base/reset.css` contains exchange-specific layout (background image, ghost houses, drag & drop), not a CSS reset
7. **No page scoping** — exchange styles have no scope class; dashboard uses `.dashboard-page` on `#container`

## Design

### File Structure

```
src/css/
├── base/
│   ├── tokens.css              (shared — design tokens, unchanged)
│   ├── forms.css               (shared — form elements, spinner, unchanged)
│   └── shared-base.css         (NEW — shared html/body resets, pageReveal animation)
├── components/
│   ├── snackbar.css            (shared — unified, dead .success/.error code removed)
│   ├── entries.css             (shared — entry rows, cardSlide animation, unchanged)
│   ├── cookie-banner.css       (shared — cookie consent, unchanged)
│   ├── user-badge.css          (shared — logged-in badge, unchanged)
│   ├── exchange/
│   │   ├── layout.css          (from base/layout.css)
│   │   ├── base.css            (from base/reset.css, scoped to .exchange)
│   │   ├── buttons.css         (from components/buttons.css)
│   │   ├── participants.css    (from components/participants.css)
│   │   ├── household.css       (from components/household.css)
│   │   ├── table.css           (from components/table.css)
│   │   ├── email-dialog.css    (from components/email-dialog.css)
│   │   ├── email-confirmation.css (from components/email-confirmation.css)
│   │   ├── recipient-search.css   (from components/recipient-search.css)
│   │   └── responsive.css      (from responsive.css)
│   └── dashboard/
│       ├── base.css            (extracted from pages.css — html/body/#container/h1/typography, scoped to .dashboard-page)
│       ├── buttons.css         (extracted from pages.css — .button overrides)
│       ├── cards.css           (extracted from pages.css — glass card sections, exchange results)
│       ├── sidebar.css         (extracted from pages.css — sidebar, nav, hamburger, backdrop)
│       ├── wishlist.css        (extracted from pages.css — wishlist entries/forms/prices, wishlist view)
│       ├── auth-gate.css       (extracted from pages.css)
│       ├── recipient-card.css  (extracted from pages.css)
│       ├── modal.css           (extracted from pages.css — unsaved changes modal)
│       └── responsive.css      (extracted from pages.css — 480px + 768px breakpoints)
├── themes/
│   └── secret-santa.css        (unchanged)
├── exchange.css                (replaces main.css — imports shared + exchange components)
├── dashboard.css               (replaces pages.css — imports shared + dashboard components)
└── all.css                     (imports exchange.css + dashboard.css)
```

### Scoping Strategy

- **Exchange page**: Add class `exchange` to the `#container` div in `index.html`. Scope exchange-specific base styles (html/body/#container/h1) under `.exchange` or using selectors already unique to the exchange page (e.g., `#background`, `#flex-div`).
- **Dashboard page**: Already has `.dashboard-page` class on `#container`. Scope dashboard-specific base styles under `.dashboard-page`.
- **Shared styles**: No scoping needed — tokens, forms, snackbar, entries, cookie-banner, user-badge apply globally.

### shared-base.css Contents

Extract the common subset from both pages:

```css
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

Exchange and dashboard `base.css` files then add their page-specific overrides on top of this.

### Snackbar Cleanup

Delete the "Snackbar Overrides" section from `pages.css` (lines 340-386) entirely. The `.success`/`.error` CSS classes are dead code — `Snackbar.js` applies success/error colors via inline styles and only uses `.show`/`.hide`/`.hidden` classes from the existing `components/snackbar.css`.

### HTML Changes

- `index.html`: Add `class="exchange"` to `<div id="container">`
- No changes to `pages/dashboard/index.html` (already has `.dashboard-page`)

### Entry Point Files

**exchange.css** (replaces main.css):
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

**dashboard.css** (replaces pages.css):
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

### What Does NOT Change

- `all.css` structure (imports exchange.css + dashboard.css)
- JS entry point imports (`import '../css/all.css'`)
- HTML `<link>` tags (already removed — Vite injects CSS)
- Any actual visual styling — this is a pure file reorganization
- `themes/secret-santa.css` content
- Shared component file contents (tokens, forms, entries, cookie-banner, user-badge)
