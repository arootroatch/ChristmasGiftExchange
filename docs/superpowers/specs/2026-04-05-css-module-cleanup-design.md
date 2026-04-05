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
- Update `Snackbar.js` to import the module and have `init()` create the snackbar element, apply the module class + `hidden`, and append it to `<body>` (the snackbar is `position: fixed` so it doesn't need a specific DOM location)
- Remove `<div id="snackbar" class="hidden"></div>` from both HTML files — the element is now created entirely by JS

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

### 5. Create shared `participant-card.module.css`, clean up `household.module.css`

The `.household` and `#name-list` share the same frost card appearance (background, backdrop-filter, border, border-radius, padding, max-width, box-shadow). Currently the household module styles `#name-list` via `:global()`.

**Fix:** Create `exchange/components/participant-card.module.css` with the shared card styles, plus classes shared between House and NameList. Both `House.js` and `NameList.js` import this module.

**`participant-card.module.css` contains:**
- `.card` — the shared frost card appearance (background, backdrop-filter, border, border-radius, padding, max-width, box-shadow)
- `.header` — the `h2` margin styles (currently `.house1Header`)
- `.nameContainer` — the name container div styles
- `.nameSelect` — the select dropdown styles
- `.nameInput` — text-transform and width (from `participants.module.css`)

**`household.module.css` becomes:**
- `.household` — only household-specific styles: `margin-top: 1rem`
- Remove all `:global(#name-list)` rules
- Remove `.house1Header`, `.nameContainer`, `.nameSelect` (moved to shared module)

**`House.js`:** imports `cardStyles` from `participant-card.module.css`, uses `cardStyles.card` alongside `houseStyles.household`

**`NameList.js`:** imports `cardStyles` from `participant-card.module.css` instead of using `houseStyles` for shared classes. Uses `cardStyles.card` on the `#name-list` div, `cardStyles.header`, `cardStyles.nameContainer`, `cardStyles.nameSelect`, `cardStyles.nameInput`.

**NameList-specific styles** (`#name-list { margin-top: 0; }`) move to `exchange/base.css`.

**`#name-list` input/select padding** (from `participants.module.css`) moves to `exchange/base.css`.

**`#left-container.secret` rules:** These are Secret Santa layout overrides. Move them to `exchange/layout.css` where other layout rules already live. These rules reference `.household` — they'll use `:global()` for the module class, or we can target via the element's additional identifying attributes. Since `layout.css` is global and these are page layout concerns, using the scoped class name with a comment is acceptable.

**Responsive overrides** for secret mode in household move to `exchange/responsive.css`.

### 6. Delete `participants.module.css`

Everything is absorbed:
- `:global(#name-list) input, select` padding → `exchange/base.css`
- `.nameInput` → `participant-card.module.css`
- Delete `participants.module.css`

### 7. Delete dead CSS

- `exchange/responsive.css` lines 17-24: remove `#input0` and `#b0` rules (unused)

## Files changed

**New/modified global CSS:**
- `base/shared-base.css` — gains `.show`/`.hide`/`.hidden` classes, `fadein`/`fadeout` keyframes, `body:has(#user-badge)` padding
- `exchange/base.css` — gains `#name-list` input padding, `#name-list` margin-top override
- `exchange/layout.css` — gains `#left-container.secret` layout rules (from household module)
- `exchange/responsive.css` — gains secret-mode responsive overrides, loses `#input0`/`#b0`

**Converted to modules:**
- `components/snackbar.css` → `components/snackbar.module.css`
- `components/cookie-banner.css` → `components/cookie-banner.module.css`
- `components/user-badge.css` → `components/user-badge.module.css`

**New modules:**
- `exchange/components/participant-card.module.css` — shared card styles, header, nameContainer, nameSelect, nameInput

**Modified modules:**
- `exchange/components/household.module.css` — remove all `:global()` rules and shared classes (moved to participant-card module)

**Deleted:**
- `exchange/components/participants.module.css`

**Modified JS:**
- `Snackbar.js` — import snackbar module, create element in `init()` and append to body
- `CookieBanner.js` — import cookie-banner module, use scoped classes
- `UserBadge.js` — import user-badge module, use scoped classes
- `House.js` — import `participant-card.module.css`, use `cardStyles.card` alongside `houseStyles.household`
- `NameList.js` — import `participant-card.module.css`, use shared card/header/container/select/input classes, remove `participants.module.css` import

**Modified HTML:**
- `index.html` — remove `<div id="snackbar" class="hidden"></div>`
- `pages/dashboard/index.html` — remove `<div id="snackbar" class="hidden"></div>`

**Modified `main.css`:**
- Remove `@import './components/snackbar.css'`
- Remove `@import './components/cookie-banner.css'`
- Remove `@import './components/user-badge.css'`

**Modified tests:**
- Any tests that assert on class names for snackbar, cookie banner, user badge, or household will need updating
