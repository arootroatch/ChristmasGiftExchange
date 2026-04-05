# CSS Module/Global Cleanup

## Problem

The CSS has an inconsistent mix of modules and globals:

- `snackbar.css` is global but styles a single component — should be a module, except `.show`/`.hide`/`.hidden` are shared utility classes used by 5+ components
- `cookie-banner.css` and `user-badge.css` are global but style single components with no shared selectors — should be modules
- `household.module.css` has 11 `:global()` usages to style `#name-list` and `#left-container.secret` — these are page layout concerns leaking into a component module
- `participants.module.css` is 10 lines where 4 are `:global()` — barely a module
- `exchange/responsive.css` has dead rules for `#input0` and `#b0`

## Design

### 1. Move `.show`/`.hide`/`.hidden` to `shared-base.css`

Move these visibility utility classes and their `fadein`/`fadeout` keyframes from `snackbar.css` to `base/shared-base.css`. They're used by Snackbar, EmailTable, CompletionModal, OrganizerForm, and FailedEmails — they're genuinely global utilities, not snackbar-specific.

### 2. Convert `snackbar.css` → `snackbar.module.css`

After extracting the utility classes, what remains is `#snackbar` positioning/layout. Convert to a module:
- Export a `snackbar` class replacing the `#snackbar` selector
- Update `Snackbar.js` to import the module and have `init()` add `styles.snackbar` to the element it finds via `#snackbar`
- The `<div id="snackbar" class="hidden">` in both HTML files stays as-is — the module class is applied at runtime by `init()`
- The `id="snackbar"` stays for JS selection; the styling moves to the module class

### 3. Convert `cookie-banner.css` → `cookie-banner.module.css`

All selectors are component-specific (`#cookie-banner`, `.cookie-banner-message`, `.cookie-btn`, etc.). Convert to module:
- Replace `#cookie-banner` with a `.banner` class
- Replace `.cookie-banner-*` with shorter module-scoped names (`.message`, `.text`, `.buttons`, `.btn`, `.btnReject`, `.btnAccept`, `.logo`)
- Replace `.dismissing` with a module-scoped class
- Move `@keyframes cookieSlideUp`/`cookieSlideDown` into the module (they're only used here)
- The responsive rule for `max-width: 480px` stays in the module
- Update `CookieBanner.js` to import the module and use scoped class names in its template

### 4. Convert `user-badge.css` → `user-badge.module.css`

All selectors are component-specific (`#user-badge`, `#user-badge-logout`). Convert to module:
- Replace `#user-badge` with a `.badge` class
- Replace `#user-badge-logout` with a `.logout` class
- The `body:has(#user-badge)` padding rule needs to stay global — move it to `base/shared-base.css` or keep it as `:global(body:has(.badge))` pattern. Since the badge ID stays for JS selection, `body:has(#user-badge)` can stay in `shared-base.css`.
- The responsive rule stays in the module with the `:global(body)` padding override
- Update `UserBadge.js` to import the module and use scoped class names

### 5. Clean up `household.module.css` — extract shared card style

The `.household` and `#name-list` share the same frost card appearance (background, backdrop-filter, border, border-radius, padding, max-width, box-shadow). Currently the household module styles `#name-list` via `:global()`.

**Fix:** Extract the shared card appearance into a global `.participant-card` class in `entries.css` (alongside the existing shared `.entry-row` pattern). Then:

- `House.js` template: add `participant-card` class alongside `houseStyles.household`
- `NameList.js` template: add `participant-card` class to `#name-list` div, stop importing `houseStyles` for the shared card appearance
- `household.module.css`: remove all `:global(#name-list)` rules — the shared styling comes from `.participant-card`
- Household-specific styles (`.household { margin-top: 1rem; }`) stay in the module
- NameList-specific styles (`#name-list { margin-top: 0; }`) move to a small block in `exchange/base.css`

**For `#left-container.secret` rules:** These are Secret Santa layout overrides. Move them to `exchange/layout.css` where other layout rules already live. The responsive overrides for secret mode move to `exchange/responsive.css`.

**For classes shared between NameList and House** (`house1Header`, `nameContainer`, `nameSelect`): `NameList.js` currently imports `houseStyles` to use these. After the refactor, these remain in `household.module.css` and NameList continues to import it — that's fine, these are genuinely shared between the two tightly-coupled components.

### 6. Merge `participants.module.css` into globals

- The `:global(#name-list) input, select` padding rule → move to `exchange/base.css`
- The `.nameInput` class (text-transform, width) → since it's only used in NameList.js, add it to `household.module.css` (NameList already imports this module)
- Delete `participants.module.css`

### 7. Delete dead CSS

- `exchange/responsive.css` lines 17-24: remove `#input0` and `#b0` rules (unused)

## Files changed

**New/modified global CSS:**
- `base/shared-base.css` — gains `.show`/`.hide`/`.hidden` classes, `fadein`/`fadeout` keyframes, `body:has(#user-badge)` padding
- `components/entries.css` — gains `.participant-card` shared class
- `exchange/base.css` — gains `#name-list` input padding, `#name-list` margin-top override
- `exchange/layout.css` — gains `#left-container.secret .household` and `#left-container.secret .household .nameContainer` rules
- `exchange/responsive.css` — gains secret-mode responsive overrides, loses `#input0`/`#b0`

**Converted to modules:**
- `components/snackbar.css` → `components/snackbar.module.css`
- `components/cookie-banner.css` → `components/cookie-banner.module.css`
- `components/user-badge.css` → `components/user-badge.module.css`

**Modified modules:**
- `exchange/components/household.module.css` — remove all `:global()` rules, gains `.nameInput` from participants

**Deleted:**
- `exchange/components/participants.module.css`

**Modified JS:**
- `Snackbar.js` — import snackbar module, apply class
- `CookieBanner.js` — import cookie-banner module, use scoped classes
- `UserBadge.js` — import user-badge module, use scoped classes
- `House.js` — add `participant-card` class
- `NameList.js` — add `participant-card` class, update `partStyles.nameInput` → `houseStyles.nameInput`
- HTML templates on both pages — update `<div id="snackbar" class="hidden">` if needed

**Modified `main.css`:**
- Remove `@import './components/snackbar.css'`
- Remove `@import './components/cookie-banner.css'`
- Remove `@import './components/user-badge.css'`

**Modified tests:**
- Any tests that assert on class names for snackbar, cookie banner, user badge, or household will need updating
