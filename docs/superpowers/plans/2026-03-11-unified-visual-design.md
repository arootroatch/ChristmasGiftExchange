# Unified Visual Design Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the visual language across all pages — frosted glass cards, flat burgundy buttons, no gold/serif, consistent entry card + delete button patterns.

**Architecture:** CSS-heavy redesign across 14 files + 4 JS component changes. Tasks are grouped into 6 independent workstreams (A–F) that can run in parallel, plus a final sequential task (G) for shared CSS extraction.

**Tech Stack:** CSS, vanilla JS, Vitest

**Spec:** `docs/superpowers/specs/2026-03-11-unified-visual-design.md`

---

## Chunk 1: Parallel Workstreams (A–F)

These 6 tasks have NO dependencies on each other and can all run simultaneously.

---

### Task A: Exchange Page Pure CSS

Updates 4 CSS files with no JavaScript or test changes needed. All changes are purely visual — no selectors or class names change.

**Files:**
- Modify: `public/css/components/buttons.css`
- Modify: `public/css/components/household.css`
- Modify: `public/css/base/layout.css`
- Modify: `public/css/base/reset.css`

- [ ] **Step 1: Update buttons.css**

Replace the entire file:

```css
.button,
.btn-bottom {
  background-color: #69292a;
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  transition: 0.2s;
  padding: 5px 10px;
  cursor: pointer;
  width: 150px;
  font-weight: bold;
  margin: 0 5px 10px 5px;
  max-height: 65px;
}

.deleteHouse {
  width: 100%;
  margin: 5px auto 0 auto;
}

#secretGenerate {
  padding: 10px;
}

.button:hover,
.btn-bottom:hover {
  background-color: #7a3233;
}

.button:active,
.btn-bottom:active {
  background-color: #5a2122;
}
```

- [ ] **Step 2: Update household.css**

Replace the `.household, #name-list` rule. Change from opaque gray to frosted glass:

```css
#house1-header {
  margin-top: 0;
}

.household,
#name-list {
  min-height: 5rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 1rem;
  max-width: 347px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

#name-list {
  margin-top: 0;
}

.household {
  margin-top: 1rem;
}

.household p,
#name-list p {
  margin: 5px;
  display: inline-block;
}

.household h2,
#name-list h2 {
  margin-top: 0;
  margin-bottom: 10px;
}

.name-select {
  width: 100%;
  color: black;
  text-align: center;
  margin-top: 15px;
}

.name-container {
  padding-bottom: 35px;
}
```

- [ ] **Step 3: Update layout.css — control strip**

Change `#control-strip` from burgundy to frosted glass:

In `public/css/base/layout.css`, replace the `#control-strip` rule:
```css
#control-strip {
  position: fixed;
  bottom: 0;
  left: 0;
  padding-top: 10px;
  width: 100%;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  justify-content: center;
  z-index: 10;
}
```

- [ ] **Step 4: Update reset.css — h1 text-shadow + intro box**

In `public/css/base/reset.css`:

Remove `text-shadow` from `h1`:
```css
h1 {
  text-align: center;
}
```

Replace `#intro` styles — from light gray to frosted glass:
```css
#intro {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.85);
  border-radius: 16px;
  margin: 20px auto;
  line-height: 1.5em;
  text-align: justify;
  max-width: 600px;
  transition: height 1s;
  padding: 5px 10px;
  position: relative;
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass. These are CSS-only changes — no selectors or class names changed.

- [ ] **Step 6: Commit**

```bash
git add public/css/components/buttons.css public/css/components/household.css public/css/base/layout.css public/css/base/reset.css
git commit -m "style: update exchange page CSS — frosted glass containers, flat buttons, no shadows"
```

---

### Task B: Name Entries (CSS + JS + Tests)

Converts participant names from plain text with red X buttons to entry card rows with circular delete buttons. Changes a CSS class name (`delete-name` → `delete-btn`) and HTML structure, so tests must be updated.

**Files:**
- Modify: `public/css/components/participants.css`
- Modify: `src/exchange/components/Name.js`
- Modify: `spec/exchange/components/Name.spec.js` (if it references `.delete-name` or `<p>` or `<br>` elements)
- Modify: `spec/exchange/components/NameList.spec.js` (if it references `.delete-name`)

**Important context:**
- `.name-wrapper` class name is NOT changing (tests and dragDrop.js depend on it)
- `.name-entered` class name is NOT changing
- Element IDs (`#wrapper-{name}`, `#delete-{name}{id}`, `#{name}{id}`) are NOT changing
- `draggable="true"` is preserved
- The `<br>` element and its ID are removed — check if any tests reference `#br{name}{id}`
- The delete button class changes from `.delete-name` to `.delete-btn`
- The name element changes from `<p>` to `<span>`
- The order flips: name comes before delete button (was button before name)
- `attachListeners()` in Name.js changes: selector `.delete-name` → `.delete-btn`, name extraction `nextElementSibling` → `previousElementSibling`

- [ ] **Step 1: Update Name.spec.js tests for new markup**

Read `spec/exchange/components/Name.spec.js` first. Update any references to:
- `.delete-name` → `.delete-btn`
- `<p>` element expectations → `<span>`
- `<br>` element expectations → removed
- Element order expectations (if name text was found via `nextElementSibling` of delete button, it's now `previousElementSibling`)

- [ ] **Step 2: Update NameList.spec.js tests for new class name**

Read `spec/exchange/components/NameList.spec.js`. Update any references to `.delete-name` → `.delete-btn`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/components/Name.spec.js spec/exchange/components/NameList.spec.js`
Expected: FAIL — tests reference `.delete-btn` but source still uses `.delete-name`

- [ ] **Step 4: Update Name.js template and attachListeners**

In `src/exchange/components/Name.js`, replace the `template()` function:

```js
function template(name) {
  const id = nextNameNumber();
  const safe = escapeAttr(name);
  return `
      <div class="name-wrapper" id="wrapper-${safe}" draggable="true">
        <span class="name-entered" id="${safe}${id}">${safe}</span>
        <button id="delete-${safe}${id}" class="delete-btn">&#10005;</button>
      </div>`;
}
```

Update `attachListeners()`:

```js
function attachListeners(container) {
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (event) => {
      const name = event.currentTarget.previousElementSibling.textContent;
      removeParticipant(name);
    });
  });
}
```

- [ ] **Step 5: Update participants.css**

Replace the entire file:

```css
.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.delete-btn:hover {
  background: rgba(180, 40, 40, 0.4);
  border-color: rgba(180, 40, 40, 0.6);
  color: #ff8888;
}

.name-input {
  text-transform: capitalize;
}

.name-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  margin-bottom: 5px;
  transition: background 0.15s;
}

.name-wrapper:hover {
  background: rgba(0, 0, 0, 0.3);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/Name.spec.js spec/exchange/components/NameList.spec.js spec/exchange/components/House.spec.js spec/exchange/dragDrop.spec.js`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add public/css/components/participants.css src/exchange/components/Name.js spec/exchange/components/Name.spec.js spec/exchange/components/NameList.spec.js
git commit -m "style: convert participant names to entry card style with circular delete buttons"
```

---

### Task C: Results Table Redesign (CSS + JS + Tests)

Replace the `<table>` element with entry card rows in a frosted glass container. Changes HTML structure, so tests must be updated.

**Files:**
- Modify: `public/css/components/table.css`
- Modify: `src/exchange/components/ResultsTable.js`
- Modify: `spec/exchange/components/ResultsTable.spec.js`

**Important context:**
- `#results-table` and `#table-body` IDs are preserved
- Tests check for `tr` and `td` elements — these become `div.result-row` and `span`
- The placeholder rows test (4 empty rows with 2 cells each) needs rethinking — the new design uses a header row + empty `#table-body` div
- `render()`, `remove()`, `init()` logic stays the same
- `clearTable()` logic stays the same (clear children of `#table-body`)

- [ ] **Step 1: Update ResultsTable.spec.js**

Read `spec/exchange/components/ResultsTable.spec.js` first. Key changes:
- The "renders table into #flex-div" test: still works (checks `#results-table` exists in `#flex-div`)
- The "renders empty placeholder rows" test: the new template has NO placeholder rows — `#table-body` starts empty. Update this test to check that `#table-body` exists and is empty (`children.length === 0`)
- The "renders results" test: change `tr`/`td` selectors to `.result-row`/`span`. Results now have 3 spans per row (giver, arrow, recipient). Giver is `firstElementChild`, recipient is `lastElementChild`.
- The "does not render in secret santa" and "removes when switching" tests: unchanged (they just check `#results-table` exists/null)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/components/ResultsTable.spec.js`
Expected: FAIL

- [ ] **Step 3: Update ResultsTable.js**

In `src/exchange/components/ResultsTable.js`, replace `template()`:

```js
function template() {
  return `<div class="results-card" id="${tableId}">
    <h2>Results</h2>
    <div class="results-header">
      <span>Giver</span>
      <span></span>
      <span>Recipient</span>
    </div>
    <div id="${tableBodyId}"></div>
  </div>`;
}
```

Replace `renderResults()`:

```js
function renderResults(assignments) {
  clearTable();
  let html = '';
  for (const assignment of assignments) {
    html += `<div class="result-row">
                <span>${assignment.giver}</span>
                <span class="result-arrow">&#8594;</span>
                <span>${assignment.recipient}</span>
            </div>`;
  }
  pushHTML(`#${tableBodyId}`, html);
}
```

- [ ] **Step 4: Update table.css**

Replace the entire file:

```css
.results-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  margin-left: 10px;
  min-width: 300px;
  width: 45%;
}

.results-card h2 {
  margin-top: 0;
  margin-bottom: 10px;
}

.results-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  padding: 6px 10px;
  margin-bottom: 6px;
}

.results-header span {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.results-header span:last-child {
  text-align: right;
}

.result-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  margin-bottom: 5px;
}

.result-row span:last-child {
  text-align: right;
}

.result-arrow {
  color: rgba(255, 255, 255, 0.3);
  width: 24px;
  text-align: center;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/ResultsTable.spec.js`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add public/css/components/table.css src/exchange/components/ResultsTable.js spec/exchange/components/ResultsTable.spec.js
git commit -m "style: replace results table with entry card rows in frosted glass container"
```

---

### Task D: Snackbar Redesign (CSS + JS + Tests)

Convert snackbar from white background with colored text to colored background with white text.

**Files:**
- Modify: `public/css/components/snackbar.css`
- Modify: `src/Snackbar.js`
- Modify: `spec/specHelper.js` (update `shouldDisplayErrorSnackbar` and `shouldDisplaySuccessSnackbar`)
- Modify: `spec/Snackbar.spec.js` (update color/border expectations in `beforeEach` reset)

**Important context:**
- `.show`, `.hide`, `.hidden` class names are NOT changing
- Animation keyframes are NOT changing
- The `showError()` and `showSuccess()` functions set inline styles — the new values are different colors
- `spec/specHelper.js` has `shouldDisplayErrorSnackbar()` and `shouldDisplaySuccessSnackbar()` that check `style.color` and `style.border` — these must be updated to new values
- `spec/Snackbar.spec.js` `beforeEach` resets `bar.style.color` and `bar.style.border` — also needs `bar.style.background` reset

- [ ] **Step 1: Update specHelper.js snackbar assertions**

In `spec/specHelper.js`, update `shouldDisplayErrorSnackbar`:
- Change expected color from `"rgb(179, 30, 32)"` / `"#b31e20"` to `"rgb(255, 255, 255)"` / `"#fff"`
- Change expected border from `"3px solid"` with red to `"1px solid"` with `"rgba(200, 60, 60, 0.4)"` / `"rgba(200,60,60,0.4)"`

Update `shouldDisplaySuccessSnackbar`:
- Change expected color from `"rgb(25, 140, 10)"` / `"#198c0a"` to `"rgb(255, 255, 255)"` / `"#fff"`
- Change expected border from `"2px solid"` with green to `"1px solid"` with `"rgba(44, 184, 24, 0.4)"` / `"rgba(44,184,24,0.4)"`

Add `style.background` assertions to both helpers:
- `shouldDisplayErrorSnackbar`: assert `bar.style.background` is `"rgba(140, 30, 30, 0.9)"`
- `shouldDisplaySuccessSnackbar`: assert `bar.style.background` is `"rgba(25, 140, 10, 0.9)"`

**Note:** Read the `expectColor` and `expectBorderColor` helper functions first to understand the exact assertion format before updating.

- [ ] **Step 2: Update Snackbar.spec.js beforeEach**

Add `bar.style.background = "";` to the `beforeEach` reset block alongside the existing `style.color` and `style.border` resets.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run spec/Snackbar.spec.js`
Expected: FAIL — tests expect new colors but source still uses old colors

- [ ] **Step 4: Update Snackbar.js**

In `src/Snackbar.js`:

```js
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
```

- [ ] **Step 5: Update snackbar.css**

Replace `#snackbar` base styles only (keep animation keyframes and `.show`/`.hide`/`.hidden` classes as-is):

```css
#snackbar {
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

(Remove `background-color: #fff`, `color: #000`, `border: 3px solid #198c0a` — those are now set by JS inline styles per-call)

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run spec/Snackbar.spec.js`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add public/css/components/snackbar.css src/Snackbar.js spec/specHelper.js spec/Snackbar.spec.js
git commit -m "style: convert snackbar to colored backgrounds with white text and backdrop blur"
```

---

### Task E: Overlay Components (CSS + minor JS)

Convert email dialog, email confirmation, and email query from light backgrounds to frosted glass. These are 3 CSS files + 1 minor JS change.

**Files:**
- Modify: `public/css/components/email-dialog.css`
- Modify: `public/css/components/email-confirmation.css`
- Modify: `public/css/components/email-query.css`
- Modify: `src/exchange/components/EmailQuery.js`

**Important context:**
- No class names or IDs change — purely visual
- EmailQuery.js has one inline style `style="color:#b31e20"` in `renderError()` that needs updating
- Test files for these components (EmailTable.spec.js, SendEmails.spec.js, EmailQuery.spec.js) should NOT need changes since no selectors change
- Read each CSS file before modifying to understand the full nesting structure

- [ ] **Step 1: Update email-dialog.css**

Read `public/css/components/email-dialog.css` first, then replace:

```css
#emailTable {
  min-height: 250px;
  min-width: 400px;
  width: auto;
  position: fixed;
  left: 50%;
  top: 20px;
  border-radius: 16px;
  transform: translateX(-50%);
  margin: 0;
  table-layout: fixed;
  z-index: 10;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  h3 {
    position: relative;
    top: -20px;
    padding: 20px;
    margin-bottom: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  #emailBtnDiv {
    display: flex;
    justify-content: space-around;
    margin-top: 5px;
  }
  .emailDiv {
    position: relative;
    top: -10px;
    color: inherit;
    display: flex;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 5px;
    margin: 0 5px 5px;
    & label {
      width: 50%;
      text-align: center;
      color: rgba(255, 255, 255, 0.7);
    }
    & input {
      width: 50%;
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      color: #f0f0f0;
    }
  }
}
```

- [ ] **Step 2: Update email-confirmation.css**

Replace:

```css
.sendEmails {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  max-width: 400px;
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.9);
  padding: 20px;
  text-align: center;
  z-index: 10;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

#hideEmails {
  margin-left: 15px;
}
```

- [ ] **Step 3: Update email-query.css**

Replace:

```css
.emailQuery {
  align-items: center;
  justify-content: space-around;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  color: rgba(255, 255, 255, 0.85);
  padding: 7px 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  width: -webkit-fit-content;
  width: -moz-fit-content;
  width: fit-content;
  margin: 30px auto 5px auto;

  & button {
    width: 80px;
    padding: 5px;
    margin-bottom: 2px;
  }
  & div {
    display: flex;
    justify-content: space-between;
    text-align: center;
  }
  & input {
    margin-top: 5px;
    width: 70%;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
    color: #f0f0f0;
  }
  & span {
    color: #fff;
    font-weight: bold;
    font-size: 1.2rem;
    margin-left: 7px;
  }
  & label {
    color: rgba(255, 255, 255, 0.7);
  }
}
```

- [ ] **Step 4: Update EmailQuery.js inline error style**

In `src/exchange/components/EmailQuery.js`, in `renderError()`, change:
```js
queryDiv.innerHTML = '<div style="color:#b31e20"></div>';
```
to:
```js
queryDiv.innerHTML = '<div style="color:rgba(255,100,100,0.9)"></div>';
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run spec/exchange/components/EmailTable spec/exchange/components/EmailQuery.spec.js`
Expected: All pass (no selector changes)

- [ ] **Step 6: Commit**

```bash
git add public/css/components/email-dialog.css public/css/components/email-confirmation.css public/css/components/email-query.css src/exchange/components/EmailQuery.js
git commit -m "style: convert email dialog, confirmation, and query to frosted glass"
```

---

### Task F: Secondary Pages CSS (pages.css)

Large single-file update. Remove gold/serif aesthetic, darken background, match button style. No JS changes — purely CSS.

**Files:**
- Modify: `public/css/pages.css`

**Important context:**
- This file is the ONLY stylesheet for the reuse, wishlist/edit, and wishlist/view pages
- Read the entire file first — it's ~530 lines
- Reference the spec section "Secondary Pages CSS" for all changes
- The snackbar section in pages.css stays as-is (green/red backgrounds, no gold)
- Key changes: drop Playfair Display import, remove gold/cream/green-glow tokens, darken background, replace all gold color references with white, match button style to exchange page

- [ ] **Step 1: Read the full pages.css file**

Read `public/css/pages.css` completely before making changes.

- [ ] **Step 2: Update design tokens and imports**

At the top of pages.css:
- Change Google Fonts import to only load Source Sans 3 (remove Playfair Display)
- Remove `--gold`, `--gold-light`, `--cream`, `--green-glow` custom properties
- Update `--burgundy-deep` to `#150808`
- Update `--text-primary` to `#f0f0f0`
- Update `--text-secondary` to `rgba(240, 240, 240, 0.7)`

- [ ] **Step 3: Update typography**

- Change all `font-family: 'Playfair Display'` references to `'Source Sans 3'` (in `h1`, `h2`, `.exchange-result h3`)
- Remove `h1::after` rule entirely (gold decorative underline)
- Remove `text-shadow` from `h1`

- [ ] **Step 4: Update background**

Simplify body `background-image` to single radial gradient:
```css
background-image: radial-gradient(ellipse at 30% 0%, rgba(90, 35, 36, 0.25) 0%, transparent 50%);
```

- [ ] **Step 5: Update buttons**

Replace `.button` styles:
```css
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

Remove `.use-exchange-btn` and `.use-exchange-btn:hover` rules entirely.

- [ ] **Step 6: Update all color references**

Replace every gold reference with white. Here are exact old → new snippets:

**h1** (line ~66): `color: var(--cream);` → `color: #fff;`

**h2** (line ~85): `color: var(--gold-light);` → `color: #fff;`

**`.wishlist-entry a`** (lines ~263-273): Replace rule:
```css
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
```

**`.wishlist-entry a:hover`** (lines ~275-278): `color: var(--gold);` → `color: #fff;`

**`.exchange-result:hover`** (line ~318): `border-color: rgba(212, 168, 75, 0.3);` → `border-color: rgba(255, 255, 255, 0.3);`

**`.exchange-result h3`** (lines ~323-328): Replace rule:
```css
.exchange-result h3 {
  font-family: 'Source Sans 3', sans-serif;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
  font-size: 1.15rem;
}
```

**`#wishlist-content a`** (line ~388): `color: var(--gold-light);` → `color: rgba(255, 255, 255, 0.9);`

**`#wishlist-content a:hover`** (line ~395): `color: var(--gold);` → `color: #fff;`

**`input:focus, textarea:focus`** (lines ~160-164): Replace rule:
```css
input:focus, textarea:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.5);
  box-shadow: var(--shadow-input), 0 0 0 2px rgba(255, 255, 255, 0.15);
}
```

**`.back-link:hover`** (line ~497): `color: var(--gold-light);` → `color: rgba(255, 255, 255, 0.9);`

**`input::placeholder, textarea::placeholder`** (line ~157): `color: rgba(250, 243, 232, 0.35);` → `color: rgba(240, 240, 240, 0.35);`

- [ ] **Step 7: Run tests**

Run: `npx vitest run spec/reuse.spec.js spec/wishlistView.spec.js spec/wishlistEdit/`
Expected: All pass (CSS-only changes, no selectors affected)

- [ ] **Step 8: Commit**

```bash
git add public/css/pages.css
git commit -m "style: remove gold/serif from secondary pages, darken background, unify buttons"
```

---

## Chunk 2: Sequential Finalization (Task G)

This task runs AFTER all parallel tasks complete. It extracts shared CSS to avoid duplication.

---

### Task G: Shared CSS Extraction + Final Verification

Extract the duplicated entry card and delete button styles into a shared file.

**Files:**
- Create: `public/css/components/entries.css`
- Modify: `public/css/main.css` (add import)
- Modify: `public/css/pages.css` (add import, remove duplicated rules)
- Modify: `public/css/components/participants.css` (remove rules that moved to entries.css)

**Important context:**
- After Tasks B and F complete, both `participants.css` and `pages.css` will have similar `.delete-btn` and entry card styles
- Extract the shared base styles into `entries.css`
- Both `main.css` and `pages.css` import `entries.css`
- Page-specific overrides stay in their respective files

- [ ] **Step 1: Read the current state of participants.css and pages.css**

After Tasks B and F have completed, read both files to identify the exact duplicated rules.

- [ ] **Step 2: Create entries.css with shared styles**

Create `public/css/components/entries.css` with the shared entry card base and delete button styles:

```css
/* Shared entry card and delete button styles */

.entry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  margin-bottom: 5px;
  transition: background 0.15s;
}

.entry-row:hover {
  background: rgba(0, 0, 0, 0.3);
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.delete-btn:hover {
  background: rgba(180, 40, 40, 0.4);
  border-color: rgba(180, 40, 40, 0.6);
  color: #ff8888;
}
```

- [ ] **Step 3: Update main.css to import entries.css**

Add `@import url('components/entries.css');` to `public/css/main.css` (before `participants.css`).

- [ ] **Step 4: Update pages.css to import entries.css**

Add `@import url('components/entries.css');` near the top of `public/css/pages.css`.
Remove the `.delete-btn` and `.delete-btn:hover` rules from pages.css (they now come from entries.css).

- [ ] **Step 5: Update participants.css and Name.js**

Remove `.delete-btn` and `.delete-btn:hover` from `public/css/components/participants.css` (now in entries.css).

Add `entry-row` as a second class to the `.name-wrapper` div in `src/exchange/components/Name.js`. In the `template()` function, change:
```js
<div class="name-wrapper" id="wrapper-${safe}" draggable="true">
```
to:
```js
<div class="name-wrapper entry-row" id="wrapper-${safe}" draggable="true">
```

Then remove the duplicate entry card styles from `.name-wrapper` in `participants.css` (they now come from `.entry-row` in entries.css). The remaining `participants.css` should be:

```css
.name-input {
  text-transform: capitalize;
}
```

(`.name-wrapper` class is still used in HTML for dragDrop.js and test selectors, but its visual styles come from `.entry-row` in entries.css)

- [ ] **Step 6: Run full test suite**

Run: `npx vitest run`
Expected: ALL tests pass

- [ ] **Step 7: Commit**

```bash
git add public/css/components/entries.css public/css/main.css public/css/pages.css public/css/components/participants.css src/exchange/components/Name.js
git commit -m "refactor: extract shared entry card and delete button styles into entries.css"
```
