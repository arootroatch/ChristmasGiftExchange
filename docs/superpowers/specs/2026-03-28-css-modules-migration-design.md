# CSS Modules Migration + Directory Restructure Design

## Goal

Migrate page-specific component CSS to CSS modules to eliminate cross-page style conflicts, restructure directories so non-component files aren't nested under `components/`, and distribute Secret Santa theme styles into their owning component modules.

## Current Problems

1. **Cross-page `.button` conflict** — Dashboard `buttons.css` loads after exchange `buttons.css` and overrides it globally, causing 4 of 5 reported regressions (button sizing, spacing, layout)
2. **Cross-page `#auth-gate` conflict** — Dashboard `auth-gate.css` styles the auth gate as a standalone card, but on the exchange page it appears inside `#organizerFormContainer` which already has card styling, creating a box-in-box
3. **Directory structure mismatch** — Non-component files (base.css, layout.css, responsive.css) live under `components/exchange/` and `components/dashboard/`
4. **Monolithic theme file** — `themes/secret-santa.css` cross-cuts multiple components using CSS nesting, which doesn't fit the CSS modules pattern

## Design

### Directory Structure

```
assets/styles/
├── base/
│   ├── tokens.css              (global — shared design tokens)
│   ├── forms.css               (global — shared form elements, spinner)
│   └── shared-base.css         (global — shared html resets, pageReveal)
├── components/
│   ├── snackbar.css            (global — shared snackbar)
│   ├── entries.css             (global — shared entry rows, cardSlide)
│   ├── cookie-banner.css       (global — shared cookie consent)
│   └── user-badge.css          (global — shared logged-in badge)
├── exchange/
│   ├── base.css                (global — exchange html/body/#container.exchange)
│   ├── layout.css              (global — flex-div, control strip, btn-div)
│   ├── responsive.css          (global — exchange media queries)
│   └── components/
│       ├── buttons.module.css
│       ├── participants.module.css
│       ├── household.module.css
│       ├── table.module.css
│       ├── email-dialog.module.css
│       ├── email-confirmation.module.css
│       └── recipient-search.module.css
├── dashboard/
│   ├── base.css                (global — dashboard html/body/#container, typography)
│   ├── responsive.css          (global — dashboard media queries)
│   └── components/
│       ├── buttons.module.css
│       ├── cards.module.css
│       ├── sidebar.module.css
│       ├── wishlist.module.css
│       ├── auth-gate.module.css
│       ├── recipient-card.module.css
│       └── modal.module.css
├── exchange.css                (entry — imports global exchange + shared styles)
├── dashboard.css               (entry — imports global dashboard + shared styles)
└── all.css                     (imports exchange.css + dashboard.css)
```

### How CSS Modules Solve the Regressions

CSS modules generate unique hashed class names per file. Exchange `buttons.module.css` produces `._button_abc123` and dashboard `buttons.module.css` produces `._button_xyz789` — they cannot collide regardless of load order. This eliminates all 5 reported regressions:

1. **Let's Go / Secret Santa buttons** — Exchange `.button` no longer overridden by dashboard `.button`
2. **Add Name button layout** — Exchange button `width: 150px` preserved
3. **Delete House width** — `.deleteHouse { width: 100% }` no longer overridden by dashboard `.button { width: auto }`
4. **Send Results spacing** — Exchange button `margin` preserved
5. **Organizer form box-in-box** — Dashboard `#auth-gate` card styling no longer applies on exchange page

### Entry Point CSS Files

`exchange.css` and `dashboard.css` only `@import` global (non-module) files. CSS modules are NOT imported via `@import` — they are imported directly by their JS component files. Vite handles the bundling automatically.

**exchange.css:**
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

/* Exchange (global only) */
@import './exchange/base.css';
@import './exchange/layout.css';
@import './exchange/responsive.css';
```

**dashboard.css:**
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

/* Dashboard (global only) */
@import './dashboard/base.css';
@import './dashboard/responsive.css';
```

### JS Component Integration

Each component imports its own CSS module and uses the generated class names in template literals:

```js
import styles from '../../../assets/styles/exchange/components/buttons.module.css';

// Template:
`<button class="${styles.button} ${styles.deleteHouse}">Delete House</button>`
```

Vite processes `.module.css` imports and returns an object mapping original class names to hashed names.

### Secret Santa Theme Distribution

`themes/secret-santa.css` is deleted. Its rules are distributed into the component modules that own those styles:

- `#left-container.secret` layout rules → `household.module.css` and `participants.module.css` (using `:global(.secret)` to reference the parent scope)
- Secret Santa responsive overrides → `exchange/responsive.css` (stays global since it references global IDs)

Example pattern inside a component module:
```css
.household { /* base styles */ }
:global(.secret) .household { /* secret santa overrides */ }
```

The `:global()` escape hatch tells CSS modules not to hash the `.secret` selector, while `.household` remains scoped to this module.

### What Stays Global

- `base/` — tokens, forms, shared-base (design tokens and element-level resets)
- `components/` — snackbar, entries, cookie-banner, user-badge (shared across pages, no conflicts)
- `exchange/base.css`, `exchange/layout.css`, `exchange/responsive.css` — page-level layout that targets IDs and elements
- `dashboard/base.css`, `dashboard/responsive.css` — page-level layout
- Entry points (`exchange.css`, `dashboard.css`, `all.css`)

### What Becomes a Module

All page-specific component CSS — 7 exchange + 7 dashboard = 14 modules total.

**Exchange modules** (imported by JS components in `src/exchange/components/`):
- `buttons.module.css` — `.button`, `.btnBottom`, `.deleteHouse`, generate glow classes
- `participants.module.css` — `.nameInput`
- `household.module.css` — `.household`, `#name-list` styles, Secret Santa household variants
- `table.module.css` — `.resultsCard`, result rows, results card header
- `email-dialog.module.css` — `#emailTable`, `#organizerFormContainer`, email form layout
- `email-confirmation.module.css` — `.sendEmails`, confirmation layout
- `recipient-search.module.css` — `.recipientSearch`, `.reuseLink`, top actions

**Dashboard modules** (imported by JS components in `src/dashboard/components/`):
- `buttons.module.css` — dashboard `.button` styles
- `cards.module.css` — glass card `section` styles, `.exchangeResult`
- `sidebar.module.css` — sidebar layout, nav items, hamburger
- `wishlist.module.css` — wishlist forms, entries, prices
- `auth-gate.module.css` — `#auth-gate` standalone card (dashboard only)
- `recipient-card.module.css` — recipient reveal, wishlist view
- `modal.module.css` — unsaved changes modal

### CSS Module Naming Convention

CSS modules in Vite camelCase class names by default. Multi-word class names in CSS use camelCase:
- `.deleteHouse` → `styles.deleteHouse`
- `.btn-bottom` → `styles.btnBottom` (Vite converts kebab-case to camelCase)
- `.button` → `styles.button`

### ID Selectors in Modules

Some component CSS currently uses ID selectors (`#emailTable`, `#organizerFormContainer`, `#name-list`). CSS modules do NOT hash ID selectors by default — only class selectors. IDs remain global, which is fine since IDs are already unique by definition. No changes needed for ID-based rules.
