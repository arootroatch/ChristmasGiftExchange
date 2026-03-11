# Unified Visual Design

## Goal

Unify the visual language across the exchange page and secondary pages (wishlist edit, wishlist view, reuse) so they feel like one application. The exchange page stays mostly as-is; the secondary pages lose their "AI-generated luxury template" feel. Both pages adopt shared component styles.

## Design Decisions

- **Fonts**: Secondary pages drop Playfair Display serif font. Use Source Sans 3 (already loaded) for all text. Exchange page keeps Arial.
- **Colors**: All gold accents removed. White/cream for headings, links, focus rings. Burgundy for buttons. Green for success states only.
- **Background**: Secondary pages darken to `#150808` with a single subtle burgundy radial glow. Remove green glow and SVG cross-hatch pattern. Exchange page keeps photo background.
- **Containers**: Both pages use frosted glass cards — `background: rgba(255,255,255,0.08)`, `backdrop-filter: blur(12px)`, `border: 1px solid rgba(255,255,255,0.15)`, `border-radius: 16px`. Exchange page replaces opaque gray containers.
- **Buttons**: Unified site-wide — `background: #69292a`, `border: 1px solid rgba(255,255,255,0.2)`, `border-radius: 6px`. No box-shadow, no text-shadow, no `border-style: outset`.
- **Control strip**: Changes from burgundy background to frosted glass (same style as content cards).
- **List entries**: Both pages use dark row cards (`background: rgba(0,0,0,0.2)`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 6px`) with circular ✕ delete buttons. Exchange page participant names adopt this style.
- **Text shadow**: Removed everywhere — headings, buttons, all elements.
- **Animations**: Secondary pages keep slide-in and page reveal animations. No animations added to exchange page.
- **Overlay components**: Email dialog, email confirmation, and email query on the exchange page are out of scope for this change. They will be addressed in a future pass if needed.

## File Changes

### Exchange Page CSS

#### `public/css/components/buttons.css`
- Remove `box-shadow` (layered 3D shadow stack) from `.button, .btn-bottom`
- Remove `text-shadow` from `.button, .btn-bottom`
- Remove `border-style: outset` from `.button, .btn-bottom`
- Change `border-radius` from `20px` to `6px`
- Add `border: 1px solid rgba(255,255,255,0.2)`
- Set `background-color: #69292a` (solid, not `#69292ac9`)
- Update hover state: remove shadow manipulation, use `background: #7a3233` (lighten)
- Update active state: remove shadow manipulation

#### `public/css/components/household.css`
- Replace `.household, #name-list` styles:
  - Remove `background-color: #9e9e9e8b`
  - Remove `border: 2px solid rgba(255,255,255,0.695)`
  - Add `background: rgba(255,255,255,0.08)`
  - Add `backdrop-filter: blur(12px)` and `-webkit-backdrop-filter: blur(12px)`
  - Add `border: 1px solid rgba(255,255,255,0.15)`
  - Change `border-radius` from `0.5rem` to `16px`
  - Add `box-shadow: 0 8px 32px rgba(0,0,0,0.4)`

#### `public/css/components/participants.css`
- Replace `.delete-name` with `.delete-btn` circular delete button styles:
  - `display: flex`, `align-items: center`, `justify-content: center`
  - `width: 28px`, `height: 28px`, `border-radius: 50%`
  - `border: 1px solid rgba(255,255,255,0.1)`
  - `background: rgba(255,255,255,0.05)`
  - `color: rgba(255,255,255,0.6)`, `font-size: 0.75rem`
  - `cursor: pointer`, `flex-shrink: 0`
  - Hover: `background: rgba(180,40,40,0.4)`, `border-color: rgba(180,40,40,0.6)`, `color: #ff8888`
- Update `.name-wrapper` to entry card style:
  - `display: flex`, `align-items: center`, `justify-content: space-between`
  - `padding: 8px 10px`
  - `background: rgba(0,0,0,0.2)`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 6px`
  - `margin-bottom: 5px`, `transition: background 0.15s`
- Update `.name-wrapper:hover` to `background: rgba(0,0,0,0.3)` (remove old burgundy hover + padding-left + border-radius + cursor)

#### `public/css/base/reset.css`
- Remove `text-shadow` from `h1`

#### `public/css/base/layout.css`
- Change `#control-strip` background from `#69292ac9` to frosted glass: `background: rgba(255,255,255,0.08)`, `backdrop-filter: blur(12px)`, `-webkit-backdrop-filter: blur(12px)`, `border-top: 1px solid rgba(255,255,255,0.15)`

#### `public/css/components/table.css`
- Replace the `<table>` styling with entry card results styling:
  - `.results-card` — frosted glass container matching `.household, #name-list`: `background: rgba(255,255,255,0.08)`, `backdrop-filter: blur(12px)`, `-webkit-backdrop-filter: blur(12px)`, `border: 1px solid rgba(255,255,255,0.15)`, `border-radius: 16px`, `padding: 1rem`, `box-shadow: 0 8px 32px rgba(0,0,0,0.4)`
  - `.results-header` — label row: `display: grid`, `grid-template-columns: 1fr auto 1fr`, `padding: 6px 10px`, `margin-bottom: 6px`
  - `.results-header span` — `font-size: 0.7rem`, `color: rgba(255,255,255,0.4)`, `text-transform: uppercase`, `letter-spacing: 0.05em`
  - `.results-header span:last-child` — `text-align: right`
  - `.result-row` — entry card style: `display: grid`, `grid-template-columns: 1fr auto 1fr`, `padding: 8px 10px`, `background: rgba(0,0,0,0.2)`, `border: 1px solid rgba(255,255,255,0.06)`, `border-radius: 6px`, `margin-bottom: 5px`
  - `.result-row span:last-child` — `text-align: right`
  - `.result-arrow` — `color: rgba(255,255,255,0.3)`, `width: 24px`, `text-align: center`
- Remove all old `.table` styles (border-collapse, th, td, tr alternating colors)

#### `public/css/components/snackbar.css`
- Remove base `background-color: #fff`, `color: #000`, `border: 3px solid #198c0a` from `#snackbar`
- Add `backdrop-filter: blur(12px)` and `-webkit-backdrop-filter: blur(12px)` to `#snackbar`
- Keep existing `.show`, `.hide`, `.hidden` classes and fade animations unchanged
- Add new class-based color rules (applied by Snackbar.js inline styles, but define CSS fallbacks):
  - `.show` base: `color: #fff`

#### `src/Snackbar.js`
- Update `showError()`: change `style.color` to `#fff`, `style.border` to `1px solid rgba(200,60,60,0.4)`, add `style.background = 'rgba(140,30,30,0.9)'`
- Update `showSuccess()`: change `style.color` to `#fff`, `style.border` to `1px solid rgba(44,184,24,0.4)`, add `style.background = 'rgba(25,140,10,0.9)'`
- The existing `.show`/`.hide`/`.hidden` class pattern and animations remain unchanged

### Secondary Pages CSS

#### `public/css/pages.css`
- Remove Playfair Display from Google Fonts import (keep Source Sans 3 only)
- Remove CSS custom properties: `--gold`, `--gold-light`, `--cream`, `--green-glow`
- Update `--burgundy-deep` to `#150808`
- Update `--text-primary` to `#f0f0f0`
- Update `--text-secondary` to `rgba(240,240,240,0.7)` (was based on cream color)

**Typography:**
- Change all `font-family: 'Playfair Display'` references to `'Source Sans 3'`, including:
  - `h1` (line 62)
  - `h2` (line 83)
  - `.exchange-result h3` (line 323)
- Remove `h1::after` gold decorative underline
- Remove `h1` `text-shadow`

**Background:**
- Simplify body `background-image` to single radial gradient: `radial-gradient(ellipse at 30% 0%, rgba(90,35,36,0.25) 0%, transparent 50%)`
- Remove green radial glow
- Remove SVG cross-hatch pattern

**Buttons:**
- Replace `.button` styles with exchange-matching spec: `background: #69292a`, `color: rgba(255,255,255,0.9)`, `border: 1px solid rgba(255,255,255,0.2)`, `border-radius: 6px`, no shadow
- Remove `.button.primary` green gradient variant — use same burgundy style
- Remove `.use-exchange-btn` and `.use-exchange-btn:hover` green gradient overrides — use same burgundy style
- Update hover to `background: #7a3233` (lighten), no translateY

**Colors:**
- `h1` color: change from `var(--cream)` to `#fff`
- `h2` color: change from `var(--gold-light)` to `#fff`
- `.wishlist-entry a` color: change from `var(--gold-light)` to `rgba(255,255,255,0.9)`, add `text-decoration: underline`, `text-decoration-color: rgba(255,255,255,0.3)`
- `.wishlist-entry a:hover` color: change from `var(--gold)` to `#fff` (keep existing `text-decoration: underline`)
- `.exchange-result:hover` border-color: change from `rgba(212,168,75,0.3)` to `rgba(255,255,255,0.3)`
- `.exchange-result h3` color: change from `var(--gold-light)` to `#fff`
- `#wishlist-content a` color: change from `var(--gold-light)` to `rgba(255,255,255,0.9)`
- `#wishlist-content a:hover` color: change from `var(--gold)` to `#fff`
- Input focus: change `border-color` from `var(--gold)` to `rgba(255,255,255,0.5)`, update `box-shadow` to white glow instead of gold
- `.back-link:hover` color: change from `var(--gold-light)` to `rgba(255,255,255,0.9)`
- `.button` color: change from `var(--cream)` to `rgba(255,255,255,0.9)`

**Snackbar:**
- Keep as-is (already uses green/red, no gold)

### JavaScript Changes

#### `src/exchange/components/Name.js`
Update the `template()` function. Current markup:
```html
<div class="name-wrapper" id="wrapper-${safe}" draggable="true">
  <button id="delete-${safe}${id}" class="delete-name">X</button>
  <p class="name-entered" id="${safe}${id}">${safe}</p>
  <br id="br${safe}${id}">
</div>
```

New markup:
```html
<div class="name-wrapper" id="wrapper-${safe}" draggable="true">
  <span class="name-entered" id="${safe}${id}">${safe}</span>
  <button id="delete-${safe}${id}" class="delete-btn">&#10005;</button>
</div>
```

Changes:
- Name text moves before delete button (entry card pattern: content left, action right)
- `<p>` becomes `<span>` (inline element, flex child)
- `<br>` element removed (flex layout handles spacing)
- Delete button class changes from `delete-name` to `delete-btn`
- Delete button content changes from "X" to `&#10005;` (multiplication sign, matching pages.css style)

Update `attachListeners()`: change selector from `.delete-name` to `.delete-btn`, and update the name extraction from `nextElementSibling` to `previousElementSibling` (since name now comes before button).

#### `src/exchange/components/ResultsTable.js`
Replace the `<table>` markup with entry card results inside a frosted glass container.

Current `template()`:
```html
<table class="table" id="results-table">
  <thead><tr><th>Giver</th><th>Recipient</th></tr></thead>
  <tbody id="table-body">...</tbody>
</table>
```

New `template()`:
```html
<div class="results-card" id="results-table">
  <h2>Results</h2>
  <div class="results-header">
    <span>Giver</span>
    <span></span>
    <span>Recipient</span>
  </div>
  <div id="table-body"></div>
</div>
```

Update `renderResults()` — replace `<tr><td>` markup with entry card rows:
```html
<div class="result-row">
  <span>${assignment.giver}</span>
  <span class="result-arrow">&#8594;</span>
  <span>${assignment.recipient}</span>
</div>
```

Update `clearTable()` — logic stays the same (clear children of `#table-body`).

The `render()`, `remove()`, and `init()` functions remain unchanged — they reference `#results-table` and `#table-body` IDs which are preserved.

### Shared CSS Extraction

Extract these shared styles into a new `public/css/components/entries.css` imported by both `main.css` and `pages.css`:
- `.entry-card` or reuse `.name-wrapper` / `.wishlist-entry` with shared base styles — the dark row card style
- `.delete-btn` — the circular ✕ button (currently defined in pages.css, will be shared)

This avoids duplicating the entry card and delete button styles across both stylesheets. The pages.css `.delete-btn` and `.wishlist-entry` definitions move into entries.css; participants.css `.name-wrapper` and `.delete-btn` are replaced by the shared import.

## Out of Scope

These components are intentionally unchanged in this pass:
- **Email dialog** (`email-dialog.css`) — white background modal with burgundy header
- **Email confirmation** (`email-confirmation.css`) — white background with green border
- **Email query** (`email-query.css`) — semi-transparent white container with black text
- **Intro box** (`#intro` in reset.css) — light gray with black text

These overlay/modal components use a different visual pattern (light backgrounds for readability in form contexts). They may be addressed in a future design pass.

## Verification Notes

- **Responsive**: After changing household container `border-radius` to `16px`, verify responsive rules in `responsive.css` still work (they reference `.household, #name-list` for width/margin but don't override border-radius).
- **Secret Santa theme**: `secret-santa.css` sets widths and positions for `.household` and `#name-list`. Verify frosted glass + new border-radius looks correct with the fixed `333px` widths.
- **Drag and drop**: The `.name-wrapper` still has `draggable="true"`. Verify the new entry card style (flex layout, no `<br>`) doesn't break drag-and-drop behavior.

## Cross-Browser Notes

- `backdrop-filter` supported in all modern browsers (Chrome 76+, Firefox 103+, Safari 9+ with `-webkit-` prefix)
- Already using `-webkit-backdrop-filter` prefix in pages.css — apply same pattern to exchange page CSS
- No other compatibility concerns with these changes
