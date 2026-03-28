# CSS Modules Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate page-specific component CSS to CSS modules, restructure directories, distribute the Secret Santa theme into component modules, and eliminate cross-page style conflicts.

**Architecture:** Rename component CSS files to `.module.css`, import them from JS components, replace hardcoded class strings with module references. Global styles (base, layout, responsive, shared components) stay as regular CSS. The `authGate.js` shared component is parameterized to accept button classes from its caller.

**Tech Stack:** Vite CSS modules (built-in), vanilla JS

**Important conventions:**
- CSS module files use **camelCase** class names (e.g., `.btnBottom` not `.btn-bottom`)
- In JS, import as `import styles from './foo.module.css'` — returns object mapping class names to hashed strings
- ID selectors (`#emailTable`) are NOT hashed by CSS modules — they remain global
- Use `:global(.className)` to reference global classes from within a module
- Global classes (`entry-row`, `ghost-text`, `show`, `hide`, `hidden`, etc.) stay as string literals in JS

---

### Task 1: Directory restructure

Move non-component files out of `components/` into page-level directories. Create `components/` subdirs for modules.

**Files:**
- Move: `assets/styles/components/exchange/{base,layout,responsive}.css` → `assets/styles/exchange/`
- Move: `assets/styles/components/exchange/*.css` (remaining) → `assets/styles/exchange/components/`
- Move: `assets/styles/components/dashboard/{base,responsive}.css` → `assets/styles/dashboard/`
- Move: `assets/styles/components/dashboard/*.css` (remaining) → `assets/styles/dashboard/components/`
- Delete: `assets/styles/components/exchange/` and `assets/styles/components/dashboard/` (now empty)

- [ ] **Step 1: Create new directories and move files**

```bash
cd assets/styles

# Exchange: non-component files to exchange/
mkdir -p exchange/components
mv components/exchange/base.css exchange/base.css
mv components/exchange/layout.css exchange/layout.css
mv components/exchange/responsive.css exchange/responsive.css

# Exchange: component files to exchange/components/
mv components/exchange/*.css exchange/components/

# Dashboard: non-component files to dashboard/
mkdir -p dashboard/components
mv components/dashboard/base.css dashboard/base.css
mv components/dashboard/responsive.css dashboard/responsive.css

# Dashboard: component files to dashboard/components/
mv components/dashboard/*.css dashboard/components/

# Clean up empty dirs
rmdir components/exchange components/dashboard
```

- [ ] **Step 2: Update exchange.css imports**

Replace the entire contents of `assets/styles/exchange.css`:

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

/* Exchange (global only — modules are imported by JS) */
@import './exchange/base.css';
@import './exchange/layout.css';
@import './exchange/responsive.css';

/* Themes */
@import './themes/secret-santa.css';
```

- [ ] **Step 3: Update dashboard.css imports**

Replace the entire contents of `assets/styles/dashboard.css`:

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

/* Dashboard (global only — modules are imported by JS) */
@import './dashboard/base.css';
@import './dashboard/responsive.css';
```

- [ ] **Step 4: Verify build**

```bash
npx vite build
```

Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: restructure CSS directories for module migration"
```

---

### Task 2: Exchange buttons module

Convert exchange buttons to a CSS module and update all JS consumers. This is the biggest task — `.button`/`.btnBottom` are used by ~10 JS files.

**CSS file:** `assets/styles/exchange/components/buttons.module.css`
**JS files to update:** House.js, NameList.js, firstScreenTemplates.js, EmailTable.js, SendResults.js, FailedEmails.js, CompletionModal.js, GenerateButton.js, ResultsTable.js

- [ ] **Step 1: Rename and convert CSS to module with camelCase classes**

Rename `assets/styles/exchange/components/buttons.css` to `assets/styles/exchange/components/buttons.module.css`.

Replace its contents with (class names converted to camelCase):

```css
.button,
.btnBottom {
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
.btnBottom:hover {
  background-color: #7a3233;
}

.button:active,
.btnBottom:active {
  background-color: #5a2122;
}

/* Generate button progressive glow */
#generate {
  transition: box-shadow 0.4s, background 0.4s;
  margin-top: 0;
  margin-bottom: 0;
}

.generateGlow1 {
  box-shadow: 0 0 15px rgba(255, 150, 160, 0.5), 0 0 35px rgba(255, 140, 150, 0.25);
}

.generateGlow2 {
  background-color: #8e3a3b;
  box-shadow: 0 0 25px rgba(255, 150, 160, 0.6), 0 0 50px rgba(255, 140, 150, 0.3);
  animation: generatePulseSoft 2.5s ease-in-out infinite;
}

.generateGlow3 {
  background: linear-gradient(135deg, #c25050, #a84445);
  box-shadow: 0 0 35px rgba(255, 150, 160, 0.8), 0 0 80px rgba(255, 140, 150, 0.4);
  animation: generatePulseStrong 1.8s ease-in-out infinite;
}

@keyframes generatePulseSoft {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 150, 160, 0.3), 0 0 25px rgba(255, 140, 150, 0.15); }
  50% { box-shadow: 0 0 30px rgba(255, 150, 160, 0.7), 0 0 60px rgba(255, 140, 150, 0.35); }
}

@keyframes generatePulseStrong {
  0%, 100% { box-shadow: 0 0 15px rgba(255, 150, 160, 0.4), 0 0 40px rgba(255, 140, 150, 0.2); }
  50% { box-shadow: 0 0 45px rgba(255, 150, 160, 0.9), 0 0 100px rgba(255, 140, 150, 0.5); }
}
```

- [ ] **Step 2: Update House.js**

Add import at top of `src/exchange/components/House.js`:
```js
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
```

In `template()`, change:
```js
<button class="button deleteHouse" id="${houseID}-delete">Delete House</button>
```
to:
```js
<button class="${btnStyles.button} ${btnStyles.deleteHouse}" id="${houseID}-delete">Delete House</button>
```

- [ ] **Step 3: Update NameList.js**

Add import at top of `src/exchange/components/NameList.js`:
```js
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
```

In `template()`, change:
```js
<button class="button" type="submit" id="add-name-btn">Add Name <span class="shortcut">(Enter)</span></button>
```
to:
```js
<button class="${btnStyles.button}" type="submit" id="add-name-btn">Add Name <span class="shortcut">(Enter)</span></button>
```

- [ ] **Step 4: Update firstScreenTemplates.js**

Add import at top of `src/exchange/firstScreenTemplates.js`:
```js
import btnStyles from '../../assets/styles/exchange/components/buttons.module.css';
```

In `introTemplate()`, change:
```js
<button class="button" id="letsGo" style="margin-bottom: 0;">Let's go!</button>
<button class="btn-bottom" id="secretSantaBtn">Secret Santa Mode</button>
```
to:
```js
<button class="${btnStyles.button}" id="letsGo" style="margin-bottom: 0;">Let's go!</button>
<button class="${btnStyles.btnBottom}" id="secretSantaBtn">Secret Santa Mode</button>
```

In `dashboardLinkTemplate()`, change:
```js
<a href="/dashboard" class="button dashboardLink-btn">Participant Dashboard</a>
```
to:
```js
<a href="/dashboard" class="${btnStyles.button} dashboardLink-btn">Participant Dashboard</a>
```

- [ ] **Step 5: Update EmailTable.js**

Add import at top of `src/exchange/components/EmailTable/EmailTable.js`:
```js
import btnStyles from '../../../../assets/styles/exchange/components/buttons.module.css';
```

In `template()`, change all three `class="button"` references:
```js
${showDismiss ? `<button class="${btnStyles.button}" id="${hideEmailsId}">Dismiss</button>` : ""}
<button type="submit" class="${btnStyles.button}" id="${submitEmailsId}">Submit Emails</button>
```
and:
```js
<div style="text-align:center;"><button class="${btnStyles.button}" id="${sendResultsBtnId}">Send Me the Results</button></div>
```

- [ ] **Step 6: Update SendResults.js**

Add import at top of `src/exchange/components/EmailTable/SendResults.js`:
```js
import btnStyles from '../../../../assets/styles/exchange/components/buttons.module.css';
```

In `confirmationTemplate()`, change:
```js
<button class="button" id="${confirmBtnId}">Continue</button>
<button class="button" id="${cancelBtnId}">Cancel</button>
```
to:
```js
<button class="${btnStyles.button}" id="${confirmBtnId}">Continue</button>
<button class="${btnStyles.button}" id="${cancelBtnId}">Cancel</button>
```

- [ ] **Step 7: Update FailedEmails.js**

Add import at top of `src/exchange/components/EmailTable/FailedEmails.js`:
```js
import btnStyles from '../../../../assets/styles/exchange/components/buttons.module.css';
```

In `failedEmailsTemplate()` — note the `buttons` parameter is passed HTML strings, so update the callers in `showFailedEmails()`:

Change the `retryCount >= 1` branch:
```js
buttons: `<button class="${btnStyles.button}" id="${viewResultsBtnId}">View Results</button>`,
```

Change the else branch:
```js
buttons: `<button class="${btnStyles.button}" id="${retryEmailsBtnId}">Retry</button>
<button class="${btnStyles.button}" id="${backToEmailsBtnId}">\u2190 Back</button>`,
```

- [ ] **Step 8: Update CompletionModal.js**

Add import at top of `src/exchange/components/CompletionModal.js`:
```js
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
```

In `template()`, change:
```js
html += `<button class="button" id="${newExchangeBtnId}">Start New Exchange</button>`;
```
to:
```js
html += `<button class="${btnStyles.button}" id="${newExchangeBtnId}">Start New Exchange</button>`;
```

- [ ] **Step 9: Update GenerateButton.js**

Add import at top of `src/exchange/components/ControlStrip/GenerateButton.js`:
```js
import btnStyles from '../../../../assets/styles/exchange/components/buttons.module.css';
```

Change the `glowClasses` array:
```js
const glowClasses = [btnStyles.generateGlow1, btnStyles.generateGlow2, btnStyles.generateGlow3];
```

In `template()`, change:
```js
<button class="btn-bottom" id="${generateId}">
```
to:
```js
<button class="${btnStyles.btnBottom}" id="${generateId}">
```

- [ ] **Step 10: Update ResultsTable.js**

Add import at top of `src/exchange/components/ResultsTable.js`:
```js
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
```

In `renderEmailResultsButton()`, change:
```js
slot.innerHTML = `<button class="btn-bottom" id="email-results-btn">Email Results</button>`;
```
to:
```js
slot.innerHTML = `<button class="${btnStyles.btnBottom}" id="email-results-btn">Email Results</button>`;
```

- [ ] **Step 11: Verify build**

```bash
npx vite build
```

Expected: build succeeds.

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "refactor: convert exchange buttons to CSS module"
```

---

### Task 3: Exchange remaining CSS modules

Convert household, participants, table, email-dialog, email-confirmation, and recipient-search to CSS modules.

#### household.module.css

- [ ] **Step 1: Rename and convert household CSS**

Rename `assets/styles/exchange/components/household.css` to `assets/styles/exchange/components/household.module.css`.

Replace contents with:

```css
#house1-header {
  margin-top: 0;
}

.household,
:global(#name-list) {
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

:global(#name-list) {
  margin-top: 0;
}

.household {
  margin-top: 1rem;
  animation: cardSlide 0.5s ease-out both;
}

.household p,
:global(#name-list) p {
  margin: 5px;
  display: inline-block;
}

.household h2,
:global(#name-list) h2 {
  margin-top: 0;
  margin-bottom: 10px;
}

.nameSelect {
  width: 100%;
  margin-top: 15px;
}

.nameContainer {
  min-height: 3rem;
  padding-bottom: 10px;
}

.household .nameContainer:empty {
  min-height: 3rem;
}
```

Note: `#name-list` and `#house1-header` are ID selectors used by NameList.js — they stay global via `:global()`. The `.household`, `.nameSelect`, and `.nameContainer` classes become module-scoped.

- [ ] **Step 2: Update House.js for household module**

Add import:
```js
import houseStyles from '../../../assets/styles/exchange/components/household.module.css';
```

In `template()`, change:
```js
<div class="household" id="${houseID}">
```
to:
```js
<div class="${houseStyles.household}" id="${houseID}">
```

Change:
```js
<div data-slot="names-${houseID}" class="name-container">
```
to:
```js
<div data-slot="names-${houseID}" class="${houseStyles.nameContainer}">
```

- [ ] **Step 3: Update NameList.js for household module**

Add import:
```js
import houseStyles from '../../../assets/styles/exchange/components/household.module.css';
```

In `template()`, change:
```js
<div class="name-container" id="${participantsId}" data-slot="names-${participantsId}"></div>
```
to:
```js
<div class="${houseStyles.nameContainer}" id="${participantsId}" data-slot="names-${participantsId}"></div>
```

Change:
```js
<select class="name-select" name="name-list-select" id="name-list-select">
```
to:
```js
<select class="${houseStyles.nameSelect}" name="name-list-select" id="name-list-select">
```

- [ ] **Step 4: Update Select.js for household module**

Add import:
```js
import houseStyles from '../../../assets/styles/exchange/components/household.module.css';
```

In `template()`, change:
```js
<select class="name-select" id="${houseID}-select">
```
to:
```js
<select class="${houseStyles.nameSelect}" id="${houseID}-select">
```

#### participants.module.css

- [ ] **Step 5: Rename and convert participants CSS**

Rename `assets/styles/exchange/components/participants.css` to `assets/styles/exchange/components/participants.module.css`.

Replace contents with:

```css
:global(#name-list) input,
:global(#name-list) select {
  padding: 5px 10px;
}

.nameInput {
  text-transform: capitalize;
  width: calc(100% - 165px);
}
```

- [ ] **Step 6: Update NameList.js for participants module**

Add import:
```js
import partStyles from '../../../assets/styles/exchange/components/participants.module.css';
```

In `template()`, change:
```js
<input type="text" id="name-input" class="name-input" placeholder="Aunt Cathy" />
```
to:
```js
<input type="text" id="name-input" class="${partStyles.nameInput}" placeholder="Aunt Cathy" />
```

#### table.module.css

- [ ] **Step 7: Rename and convert table CSS**

Rename `assets/styles/exchange/components/table.css` to `assets/styles/exchange/components/table.module.css`.

Replace contents with:

```css
.resultsCard {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 1rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  width: 300px;
  flex-shrink: 0;
  position: sticky;
  top: 10px;
  align-self: flex-start;
  z-index: 5;
}

.resultsCard h2 {
  margin-top: 0;
  margin-bottom: 10px;
}

.resultsHeader {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  padding: 6px 10px;
  margin-bottom: 6px;
}

.resultsHeader span {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.resultsHeader span:first-child {
  text-align: left;
}

.resultsHeader span:last-child {
  text-align: right;
}

.resultRow {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  margin-bottom: 5px;
  animation: cardSlide 0.4s ease-out both;
}

.resultRow span:first-child {
  text-align: left;
}

.resultRow span:last-child {
  text-align: right;
}

.resultArrow {
  color: rgba(255, 255, 255, 0.3);
  width: 24px;
  text-align: center;
}

.resultsCardHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.resultsCardHeader h2 {
  margin: 0;
}

#email-results-btn {
  font-size: 0.8rem;
  padding: 6px 12px;
}
```

- [ ] **Step 8: Update ResultsTable.js for table module**

Add import:
```js
import tableStyles from '../../../assets/styles/exchange/components/table.module.css';
```

In `template()`, change:
```js
return `<div class="results-card" id="${tableId}">
    <div class="results-card-header">
```
to:
```js
return `<div class="${tableStyles.resultsCard}" id="${tableId}">
    <div class="${tableStyles.resultsCardHeader}">
```

Change:
```js
<div class="results-header">
```
to:
```js
<div class="${tableStyles.resultsHeader}">
```

In `renderResults()`, change:
```js
html += `<div class="result-row"${delay}>
            <span>${assignment.giver}</span>
            <span class="result-arrow">&#8594;</span>
```
to:
```js
html += `<div class="${tableStyles.resultRow}"${delay}>
            <span>${assignment.giver}</span>
            <span class="${tableStyles.resultArrow}">&#8594;</span>
```

Export `tableStyles` for use by SendResults.js:
```js
export {tableStyles};
```

- [ ] **Step 9: Update SendResults.js for table module**

Add import:
```js
import {tableStyles} from '../ResultsTable.js';
```

In `resultsTableHtml()`, change:
```js
let html = '<div class="results-card" style="margin: 0 auto;"><h2>Results</h2><div class="results-header"><span>Giver</span><span></span><span>Recipient</span></div><div>';
for (const a of assignments) {
    html += `<div class="result-row"><span>${escapeAttr(a.giver)}</span><span class="result-arrow">&#8594;</span><span>${escapeAttr(a.recipient)}</span></div>`;
}
```
to:
```js
let html = `<div class="${tableStyles.resultsCard}" style="margin: 0 auto;"><h2>Results</h2><div class="${tableStyles.resultsHeader}"><span>Giver</span><span></span><span>Recipient</span></div><div>`;
for (const a of assignments) {
    html += `<div class="${tableStyles.resultRow}"><span>${escapeAttr(a.giver)}</span><span class="${tableStyles.resultArrow}">&#8594;</span><span>${escapeAttr(a.recipient)}</span></div>`;
}
```

#### email-dialog.module.css

- [ ] **Step 10: Rename and convert email-dialog CSS**

Rename `assets/styles/exchange/components/email-dialog.css` to `assets/styles/exchange/components/email-dialog.module.css`.

Replace contents with (note: `#emailTable` and `#organizerFormContainer` are IDs — not hashed):

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
}

#emailTable h3 {
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
}

.emailDiv label {
  width: 50%;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: inherit;
  font-weight: normal;
  text-transform: none;
  letter-spacing: normal;
  margin-bottom: 0;
}

.emailDiv input {
  width: 50%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #f0f0f0;
}

.emailInput:global(.duplicate-email) {
  border-color: red;
}

#organizerFormContainer {
  min-width: 400px;
  width: auto;
  position: fixed;
  left: 50%;
  top: 20px;
  border-radius: 16px;
  transform: translateX(-50%);
  z-index: 10;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  padding: 20px;
}

#organizerFormContainer #auth-gate {
  background: none;
  border: none;
  border-radius: 0;
  padding: 0;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  margin: 0;
  max-width: none;
  animation: none;
}

#organizerFormContainer #auth-gate h2 {
  margin-top: 0;
  margin-bottom: 15px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 15px;
}

#organizerFormContainer #auth-gate label {
  display: block;
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-size: inherit;
  font-weight: normal;
  text-transform: none;
  letter-spacing: normal;
}

#organizerFormContainer #auth-gate input {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  color: #f0f0f0;
  padding: 8px;
  margin-top: 4px;
  box-sizing: border-box;
}
```

Key change: Added `#organizerFormContainer #auth-gate` reset rules to neutralize the dashboard auth-gate styles (background, border, padding, etc.) when auth-gate appears inside the organizer form. This fixes the "box-in-box" regression.

- [ ] **Step 11: Update EmailTable.js for email-dialog module**

Add import:
```js
import dialogStyles from '../../../../assets/styles/exchange/components/email-dialog.module.css';
```

In `emailInput()`, change:
```js
<div class="emailDiv">
```
to:
```js
<div class="${dialogStyles.emailDiv}">
```

The `.emailInput` class stays as a string since it's used by `getElementsByClassName` — but add a `:global()` reference in the CSS module so the duplicate-email selector works. Actually, `.emailInput` is used in `findDuplicateEmails()` via `getElementsByClassName("emailInput")`. If we convert it to a module class, `getElementsByClassName` won't find the hashed name. So keep `.emailInput` as a global class. The CSS module already handles this with `.emailInput:global(.duplicate-email)`.

Wait — `.emailInput` needs to stay global since it's queried by `getElementsByClassName`. Change the CSS rule to use `:global(.emailInput)`:

Replace in the module:
```css
.emailInput:global(.duplicate-email) {
```
with:
```css
:global(.emailInput.duplicate-email) {
  border-color: red;
}
```

#### email-confirmation.module.css

- [ ] **Step 12: Rename and convert email-confirmation CSS**

Rename `assets/styles/exchange/components/email-confirmation.css` to `assets/styles/exchange/components/email-confirmation.module.css`.

Replace contents with:

```css
.sendEmails {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  width: calc(100% - 40px);
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
  box-sizing: border-box;
  overflow: auto;
  max-height: calc(100vh - 40px);
}

#hideEmails {
  margin-left: 15px;
}

.sendEmails :global(.resultsCard) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  position: static;
}

.sendEmails label {
  display: inline;
  font-size: inherit;
  font-weight: normal;
  text-transform: none;
  letter-spacing: normal;
  margin-bottom: 0;
}
```

Wait — `.resultsCard` is now a module class from `table.module.css`. Inside `email-confirmation.module.css`, we can't reference another module's hashed class. We need a different approach.

The `.sendEmails .results-card` override makes the results card full-width when embedded in a send-emails modal. Since `.resultsCard` is now hashed, this cross-module reference won't work with a simple CSS selector.

**Solution:** Move this override to `table.module.css` using `:global()`:

In `table.module.css`, add at the bottom:
```css
:global(.sendEmails) .resultsCard {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  position: static;
}
```

Wait, but `.sendEmails` is also a module class. Hmm. Actually, the `.sendEmails` class wraps the results card in SendResults.js and CompletionModal.js. If `.sendEmails` is hashed, then `:global(.sendEmails)` won't match.

**Better solution:** Export both classes and handle the override with a dedicated class on the results card when it's embedded. But that changes component logic.

**Simplest solution:** In `email-confirmation.module.css`, reference the table module's class with a structural selector instead:

Actually, the simplest fix is to put the override inline where it's used. In `SendResults.js`, the `resultsTableHtml` already adds `style="margin: 0 auto;"`. We can add `style="width:100%;max-width:100%;position:static;"` instead.

OR: add a `.embedded` variant class to `table.module.css`:

```css
.resultsCard.embedded {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  position: static;
}
```

Then in `SendResults.js`:
```js
`<div class="${tableStyles.resultsCard} ${tableStyles.embedded}" ...>`
```

This is cleanest. Let me use this approach.

**Updated table.module.css** — add at the bottom:
```css
.embedded {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  position: static;
}
```

**Updated SendResults.js** `resultsTableHtml()`:
```js
let html = `<div class="${tableStyles.resultsCard} ${tableStyles.embedded}"><h2>Results</h2>...`;
```

Now email-confirmation.module.css becomes:

```css
.sendEmails {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  width: calc(100% - 40px);
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
  box-sizing: border-box;
  overflow: auto;
  max-height: calc(100vh - 40px);
}

#hideEmails {
  margin-left: 15px;
}

.sendEmails label {
  display: inline;
  font-size: inherit;
  font-weight: normal;
  text-transform: none;
  letter-spacing: normal;
  margin-bottom: 0;
}
```

- [ ] **Step 13: Update JS files for email-confirmation module**

The `.sendEmails` class is used in **four** JS files. Add import and replace class references in each:

**EmailTable.js** — already has `dialogStyles` import. Add:
```js
import confirmStyles from '../../../../assets/styles/exchange/components/email-confirmation.module.css';
```

In `template()`, change:
```js
<div id="${emailTableId}" class="show">
```
This doesn't use `.sendEmails` — EmailTable uses `#emailTable` ID. No change needed for EmailTable.

**SendResults.js** — add import:
```js
import confirmStyles from '../../../../assets/styles/exchange/components/email-confirmation.module.css';
```

In `confirmationTemplate()`, change:
```js
<div id="${confirmId}" class="sendEmails show">
```
to:
```js
<div id="${confirmId}" class="${confirmStyles.sendEmails} show">
```

In `resultsTableHtml()`, update the results card to use `.embedded`:
```js
let html = `<div class="${tableStyles.resultsCard} ${tableStyles.embedded}"><h2>Results</h2><div class="${tableStyles.resultsHeader}"><span>Giver</span><span></span><span>Recipient</span></div><div>`;
```

**FailedEmails.js** — add import:
```js
import confirmStyles from '../../../../assets/styles/exchange/components/email-confirmation.module.css';
```

In `failedEmailsTemplate()`, change:
```js
<div id="${failedEmailsId}" class="sendEmails show">
```
to:
```js
<div id="${failedEmailsId}" class="${confirmStyles.sendEmails} show">
```

**CompletionModal.js** — add import:
```js
import confirmStyles from '../../../assets/styles/exchange/components/email-confirmation.module.css';
```

In `template()`, change:
```js
html = `<div id="${modalId}" class="sendEmails show">`;
```
to:
```js
html = `<div id="${modalId}" class="${confirmStyles.sendEmails} show">`;
```

#### recipient-search.module.css

- [ ] **Step 14: Rename and convert recipient-search CSS**

Rename `assets/styles/exchange/components/recipient-search.css` to `assets/styles/exchange/components/recipient-search.module.css`.

This file uses `.recipientSearch`, `.reuseLink`, and other classes. Check where they're rendered:

Looking at the CSS, the selectors target `#top-actions`, `.recipientSearch`, `.reuseLink`. Let me check where these are created in JS.

The `#top-actions` div and `.recipientSearch`/`.reuseLink` are likely created by exchange components after the generate step. These classes are only used on the exchange page with no dashboard conflict.

Replace contents with (camelCase conversion):

```css
#top-actions {
  display: flex;
  justify-content: center;
  align-items: stretch;
  gap: 12px;
  max-width: 600px;
  margin: 20px auto 0;
}

#top-actions > [data-slot] {
  display: flex;
}

.recipientSearch,
.reuseLink {
  background: var(--frost);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--frost-border);
  border-radius: var(--radius-lg);
  color: rgba(255, 255, 255, 0.85);
  padding: 10px 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.recipientSearch {
  gap: 8px;
}

.recipientSearch div:has(input) {
  display: flex;
  align-items: stretch;
  gap: 8px;
  width: 100%;
}

.recipientSearch div:has(input) button {
  width: 80px;
  padding: 5px;
  margin-bottom: 0;
}

.recipientSearch input {
  flex: 1;
  min-width: 0;
}

.recipientSearch span {
  color: #fff;
  font-weight: bold;
}

.recipientSearch p {
  margin: 2px 0;
  line-height: 1.3;
}

.recipientSearch .dateSecondary {
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.85em;
  margin-top: 2px;
}

.recipientSearch #wishlistEmailBtn {
  margin: 4px 16px 0;
  padding: 8px 16px;
  width: calc(100% - 32px);
}

.recipientSearch label {
  color: var(--text-secondary);
}

.reuseLink {
  gap: 12px;
}

.reuseLink label {
  color: var(--text-secondary);
}
```

I need to find the JS files that render `.recipientSearch` and `.reuseLink` to update them. Let me note this for the implementer — they'll need to search for these class names in the JS codebase and update accordingly.

Actually, looking at the exchange responsive.css, it references `.recipientSearch` and `.reuseLink` too. Since responsive.css is global, it needs `:global()` or we need to keep these in global CSS.

**Decision:** Since `recipient-search.css` has `#top-actions` (ID selector) and these classes are only used on the exchange page, there's minimal conflict risk. For simplicity, keep this file as global CSS (don't convert to module). It's already exchange-scoped by its selectors, and making it a module would require updating the responsive.css references too.

Rename it back:
```bash
mv assets/styles/exchange/components/recipient-search.module.css assets/styles/exchange/components/recipient-search.css
```

And add it to `exchange.css` as a global import:
```css
@import './exchange/components/recipient-search.css';
```

- [ ] **Step 15: Verify build**

```bash
npx vite build
```

Expected: build succeeds.

- [ ] **Step 16: Commit**

```bash
git add -A && git commit -m "refactor: convert exchange household, participants, table, email-dialog, email-confirmation to CSS modules"
```

---

### Task 4: Parameterize authGate button classes

The shared `authGate.js` is used by both exchange (in OrganizerForm.js) and dashboard (in dashboard/index.js). Make it accept a `buttonClass` parameter so each caller provides its page's scoped button class.

**Files:**
- Modify: `src/authGate.js`
- Modify: `src/exchange/components/OrganizerForm.js`
- Modify: `src/dashboard/index.js`

- [ ] **Step 1: Update authGate.js to accept buttonClass**

In `src/authGate.js`, change the `authGateTemplate` function signature:
```js
export function authGateTemplate({heading, showName, buttonClass = 'button'} = {}) {
```

Change the two button elements to use the parameter:
```js
<button id="auth-send-code" class="${buttonClass}">Send Verification Code</button>
```
and:
```js
<button id="auth-verify-code" class="${buttonClass}">Verify</button>
```

- [ ] **Step 2: Update OrganizerForm.js to pass exchange button class**

In `src/exchange/components/OrganizerForm.js`, add import:
```js
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
```

In `render()`, change:
```js
const html = `<div id="${containerId}" class="show">${authGateTemplate({heading: "Who's organizing this exchange?", showName: true})}</div>`;
```
to:
```js
const html = `<div id="${containerId}" class="show">${authGateTemplate({heading: "Who's organizing this exchange?", showName: true, buttonClass: btnStyles.button})}</div>`;
```

- [ ] **Step 3: Update dashboard/index.js to pass dashboard button class**

This will be done in Task 5 when dashboard buttons module is created. For now, the default `buttonClass = 'button'` keeps dashboard working with global CSS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "refactor: parameterize authGate button class for CSS module support"
```

---

### Task 5: Dashboard buttons + cards modules

**Files:**
- Rename: `assets/styles/dashboard/components/buttons.css` → `buttons.module.css`
- Rename: `assets/styles/dashboard/components/cards.css` → `cards.module.css`
- Modify: `src/dashboard/index.js`, `src/dashboard/components/WishlistList.js`, `src/dashboard/components/ItemList.js`, `src/dashboard/components/ContactForm.js`, `src/dashboard/components/SaveButton.js`, `src/dashboard/components/ReuseSection.js`

- [ ] **Step 1: Rename and convert dashboard buttons CSS**

Rename `assets/styles/dashboard/components/buttons.css` to `assets/styles/dashboard/components/buttons.module.css`.

Replace contents with:

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

.primary {
  font-size: 1rem;
  padding: 12px 32px;
  width: 100%;
  margin-top: 8px;
}

.primary:hover {
  background: #7a3233;
}

.modalLeave {
  background: transparent !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  color: var(--text-secondary) !important;
}

.modalLeave:hover {
  color: var(--text-primary) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}
```

Note: `.modal-leave` styles moved here from `modal.css` since they're button variants. Converted to `.modalLeave`.

- [ ] **Step 2: Update dashboard/index.js for buttons module**

Add import:
```js
import btnStyles from '../../assets/styles/dashboard/components/buttons.module.css';
```

In `dashboardLayout()` — no `.button` classes used there.

In `showUnsavedModal()`, change:
```js
<button class="button" id="modal-cancel">Stay</button>
<button class="button modal-leave" id="modal-leave">Leave</button>
```
to:
```js
<button class="${btnStyles.button}" id="modal-cancel">Stay</button>
<button class="${btnStyles.button} ${btnStyles.modalLeave}" id="modal-leave">Leave</button>
```

In `showAuthGate()`, update the authGate call to pass the dashboard button class:
```js
content.innerHTML = authGateTemplate({heading: 'Verify Your Email', buttonClass: btnStyles.button});
```

- [ ] **Step 3: Update WishlistList.js**

Add import:
```js
import btnStyles from '../../../assets/styles/dashboard/components/buttons.module.css';
```

In `template()`, change:
```js
<button id="add-wishlist-btn" class="button">Add</button>
```
to:
```js
<button id="add-wishlist-btn" class="${btnStyles.button}">Add</button>
```

- [ ] **Step 4: Update ItemList.js**

Add import:
```js
import btnStyles from '../../../assets/styles/dashboard/components/buttons.module.css';
```

In `template()`, change:
```js
<button id="add-item-btn" class="button">Add</button>
```
to:
```js
<button id="add-item-btn" class="${btnStyles.button}">Add</button>
```

- [ ] **Step 5: Update ContactForm.js**

Add import:
```js
import btnStyles from '../../../assets/styles/dashboard/components/buttons.module.css';
```

In `template()`, change:
```js
<button id="send-contact-btn" class="button">Send to My Secret Santa</button>
```
to:
```js
<button id="send-contact-btn" class="${btnStyles.button}">Send to My Secret Santa</button>
```

- [ ] **Step 6: Update SaveButton.js**

Add import:
```js
import btnStyles from '../../../assets/styles/dashboard/components/buttons.module.css';
```

In `template()`, change:
```js
return '<button id="save-wishlist-btn" class="button primary" disabled>Save Wishlist</button>';
```
to:
```js
return `<button id="save-wishlist-btn" class="${btnStyles.button} ${btnStyles.primary}" disabled>Save Wishlist</button>`;
```

- [ ] **Step 7: Update ReuseSection.js**

Add import:
```js
import btnStyles from '../../../assets/styles/dashboard/components/buttons.module.css';
```

In `renderResults()`, change:
```js
<button class="button use-exchange-btn" data-exchange='${escapeAttr(JSON.stringify(ex))}'>
```
to:
```js
<button class="${btnStyles.button} use-exchange-btn" data-exchange='${escapeAttr(JSON.stringify(ex))}'>
```

Note: `use-exchange-btn` stays as a global class since it's queried by `querySelectorAll('.use-exchange-btn')`.

- [ ] **Step 8: Rename and convert dashboard cards CSS**

Rename `assets/styles/dashboard/components/cards.css` to `assets/styles/dashboard/components/cards.module.css`.

Replace contents with:

```css
.card {
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

.card:nth-child(2) { animation-delay: 0.08s; }
.card:nth-child(3) { animation-delay: 0.16s; }
.card:nth-child(4) { animation-delay: 0.24s; }

.exchangeResult {
  background: var(--frost);
  border: 1px solid var(--frost-border);
  border-radius: var(--radius-md);
  padding: 20px;
  margin-bottom: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  animation: cardSlide 0.4s ease-out both;
}

.exchangeResult:hover {
  border-color: rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.exchangeResult h3 {
  font-family: 'Source Sans 3', sans-serif;
  font-weight: 600;
  color: #fff;
  margin: 0 0 8px;
  font-size: 1.15rem;
}

.exchangeResult p {
  margin: 4px 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.exchangeResult p strong {
  color: var(--text-primary);
  font-weight: 600;
}
```

Note: renamed `section` selector to `.card` class since element selectors aren't module-scoped. Dashboard components that render `<section>` will need to add this class.

- [ ] **Step 9: Update dashboard components that render `<section>` to add card class**

Add import in `WishlistList.js`:
```js
import cardStyles from '../../../assets/styles/dashboard/components/cards.module.css';
```

Change `<section id="wishlists-section">` to `<section id="wishlists-section" class="${cardStyles.card}">`.

Similarly in `ItemList.js`:
```js
import cardStyles from '../../../assets/styles/dashboard/components/cards.module.css';
```
Change `<section id="items-section">` to `<section id="items-section" class="${cardStyles.card}">`.

In `ContactForm.js`:
```js
import cardStyles from '../../../assets/styles/dashboard/components/cards.module.css';
```
Change `<section id="contact-section">` to `<section id="contact-section" class="${cardStyles.card}">`.

In `RecipientCard.js`:
```js
import cardStyles from '../../../assets/styles/dashboard/components/cards.module.css';
```
Change `<section id="recipient-card">` to `<section id="recipient-card" class="${cardStyles.card}">`.

In `ReuseSection.js`, add import and update the exchange result class:
```js
import cardStyles from '../../../assets/styles/dashboard/components/cards.module.css';
```
Change `<div class="exchange-result">` to `<div class="${cardStyles.exchangeResult}">`.

- [ ] **Step 10: Verify build**

```bash
npx vite build
```

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "refactor: convert dashboard buttons and cards to CSS modules"
```

---

### Task 6: Dashboard remaining CSS modules

Convert sidebar, wishlist, auth-gate, recipient-card, and modal to CSS modules.

#### sidebar.module.css

- [ ] **Step 1: Rename and convert sidebar CSS**

Rename `assets/styles/dashboard/components/sidebar.css` to `assets/styles/dashboard/components/sidebar.module.css`.

Replace contents — keep all selectors that use `.dashboard-page`, `.dashboard-*`, `.sidebar-*`, `.nav-item`, `.hamburger-*` as `:global()` since they're referenced by class name in `dashboard/index.js` templates and event handlers (`classList.toggle`, `querySelectorAll`).

Since almost all sidebar classes are toggled or queried directly in JS (`.open`, `.active`, `querySelectorAll('.nav-item')`), **keep sidebar.css as global CSS** rather than converting to a module. The sidebar classes don't conflict with exchange classes.

```bash
mv assets/styles/dashboard/components/sidebar.module.css assets/styles/dashboard/components/sidebar.css
```

Add to `dashboard.css`:
```css
@import './dashboard/components/sidebar.css';
```

#### wishlist.module.css

- [ ] **Step 2: Rename and convert wishlist CSS**

Rename `assets/styles/dashboard/components/wishlist.css` to `assets/styles/dashboard/components/wishlist.module.css`.

Replace contents with:

```css
/* Wishlist add-form row */
.addForm {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 8px;
  align-items: start;
}

.addFormItems {
  grid-template-columns: 1fr auto auto;
}

.itemFormUrl {
  grid-column: 1 / -1;
}

.addForm input {
  margin-bottom: 0;
}

.addForm label {
  margin-bottom: 2px;
}

.addForm :global(.button) {
  height: 40px;
  padding: 0 16px;
  white-space: nowrap;
  align-self: end;
}

/* Item price */
.itemPrice {
  color: var(--text-secondary);
  font-size: 0.9rem;
  white-space: nowrap;
  margin-right: 12px;
}

#item-price {
  width: 100px;
}

/* Wishlist entries */
.wishlistEntry {
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

.wishlistEntry:hover {
  background: rgba(0, 0, 0, 0.3);
}

.wishlistEntry a {
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

.wishlistEntry a:hover {
  color: #fff;
}
```

Note: Renamed `#add-wishlist-form` / `#add-item-form` ID selectors to `.addForm` / `.addFormItems` classes since IDs can't be reused and the module pattern works better with classes. The `.addForm :global(.button)` reference uses `:global()` because `.button` is now a dashboard module class — but since it's scoped to `.addForm`, this targets any button inside the form regardless of which module it came from.

Wait — actually `.button` inside the form IS the dashboard module's hashed class. `:global(.button)` would match an unhashed `.button`. Since the dashboard button is now hashed, this selector won't match.

**Better approach:** Use a structural selector instead:

```css
.addForm button {
  height: 40px;
  padding: 0 16px;
  white-space: nowrap;
  align-self: end;
}
```

This targets any `<button>` element inside `.addForm`, regardless of class name.

- [ ] **Step 3: Update WishlistList.js for wishlist module**

Add import:
```js
import wishStyles from '../../../assets/styles/dashboard/components/wishlist.module.css';
```

In `template()`, change:
```js
<div id="add-wishlist-form">
```
to:
```js
<div class="${wishStyles.addForm}">
```

In `entryTemplate()`, change:
```js
<div class="wishlist-entry">
```
to:
```js
<div class="${wishStyles.wishlistEntry}">
```

- [ ] **Step 4: Update ItemList.js for wishlist module**

Add import:
```js
import wishStyles from '../../../assets/styles/dashboard/components/wishlist.module.css';
```

In `template()`, change:
```js
<div id="add-item-form">
```
to:
```js
<div class="${wishStyles.addForm} ${wishStyles.addFormItems}">
```

Change:
```js
<div class="item-form-url">
```
to:
```js
<div class="${wishStyles.itemFormUrl}">
```

In `entryTemplate()`, change:
```js
<div class="wishlist-entry">
```
to:
```js
<div class="${wishStyles.wishlistEntry}">
```

Change:
```js
<span class="item-price">
```
to:
```js
<span class="${wishStyles.itemPrice}">
```

#### auth-gate.module.css

- [ ] **Step 5: Rename and convert auth-gate CSS**

Rename `assets/styles/dashboard/components/auth-gate.css` to `assets/styles/dashboard/components/auth-gate.module.css`.

Replace contents with:

```css
.authGate {
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
}

.authGate h2 {
  margin-top: 0;
  margin-bottom: 12px;
}
```

Note: Changed from `#auth-gate` ID selector to `.authGate` class selector so it's module-scoped. This prevents the dashboard auth-gate card styles from leaking onto the exchange page's `#organizerFormContainer #auth-gate`.

- [ ] **Step 6: Update dashboard/index.js for auth-gate module**

Add import:
```js
import authGateStyles from '../../assets/styles/dashboard/components/auth-gate.module.css';
```

In `showAuthGate()`, change:
```js
content.innerHTML = authGateTemplate({heading: 'Verify Your Email', buttonClass: btnStyles.button});
```
to:
```js
content.innerHTML = authGateTemplate({heading: 'Verify Your Email', buttonClass: btnStyles.button, gateClass: authGateStyles.authGate});
```

- [ ] **Step 7: Update authGate.js to accept gateClass**

Change the function signature:
```js
export function authGateTemplate({heading, showName, buttonClass = 'button', gateClass = ''} = {}) {
```

Change:
```js
<div id="auth-gate">
```
to:
```js
<div id="auth-gate" class="${gateClass}">
```

The dashboard passes `gateClass: authGateStyles.authGate` for card styling. The exchange doesn't pass it (empty string), so no card styles apply — the `#organizerFormContainer` provides the card styling instead.

#### recipient-card.module.css

- [ ] **Step 8: Rename and convert recipient-card CSS**

Rename `assets/styles/dashboard/components/recipient-card.css` to `assets/styles/dashboard/components/recipient-card.module.css`.

Replace contents with:

```css
.recipientReveal {
  font-size: 1.2rem;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.recipientReveal strong {
  color: #198c0a;
  font-size: 1.4rem;
}

.dateSecondary {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0 0 16px;
}

.wishlistView ul {
  list-style: none;
  padding: 0;
  margin: 12px 0 0;
}

.wishlistView li {
  padding: 10px 14px;
  margin-bottom: 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-sm);
}

.wishlistView a {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
  font-weight: 500;
}

.wishlistView a:hover {
  color: #fff;
  text-decoration: underline;
}
```

- [ ] **Step 9: Update RecipientCard.js**

Add import:
```js
import rcStyles from '../../../assets/styles/dashboard/components/recipient-card.module.css';
```

In `renderRecipient()`, change:
```js
<p class="recipient-reveal">You're buying a gift for <strong>${escape(recipientName)}!</strong></p>
<p class="date-secondary">As of ${escape(dateObj.toDateString())}</p>
```
to:
```js
<p class="${rcStyles.recipientReveal}">You're buying a gift for <strong>${escape(recipientName)}!</strong></p>
<p class="${rcStyles.dateSecondary}">As of ${escape(dateObj.toDateString())}</p>
```

Change:
```js
<div id="recipient-wishlist-view" hidden>
```
to:
```js
<div class="${rcStyles.wishlistView}" id="recipient-wishlist-view" hidden>
```

In `renderWishlist()`, update the `item-price` class reference:
```js
import wishStyles from '../../../assets/styles/dashboard/components/wishlist.module.css';
```

Change:
```js
const price = item.price ? ` <span class="item-price">`
```
to:
```js
const price = item.price ? ` <span class="${wishStyles.itemPrice}">`
```

#### modal.module.css

- [ ] **Step 10: Rename and convert modal CSS**

Rename `assets/styles/dashboard/components/modal.css` to `assets/styles/dashboard/components/modal.module.css`.

Replace contents with:

```css
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease-out;
}

.dialog {
  background: var(--burgundy-deep);
  border: 1px solid var(--frost-border);
  border-radius: var(--radius-lg);
  padding: 28px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
}

.dialog h3 {
  font-family: 'Source Sans 3', 'Georgia', serif;
  font-weight: 600;
  font-size: 1.15rem;
  color: #fff;
  margin: 0 0 8px;
}

.dialog p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 20px;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Note: `.modal-leave` moved to buttons module in Step 1 of this task.

- [ ] **Step 11: Update dashboard/index.js for modal module**

Add import:
```js
import modalStyles from '../../assets/styles/dashboard/components/modal.module.css';
```

In `showUnsavedModal()`, change:
```js
modal.className = 'modal-backdrop';
modal.innerHTML = `
    <div class="modal-dialog">
```
to:
```js
modal.className = modalStyles.backdrop;
modal.innerHTML = `
    <div class="${modalStyles.dialog}">
```

Change:
```js
<div class="modal-actions">
```
to:
```js
<div class="${modalStyles.actions}">
```

- [ ] **Step 12: Verify build**

```bash
npx vite build
```

- [ ] **Step 13: Commit**

```bash
git add -A && git commit -m "refactor: convert dashboard sidebar, wishlist, auth-gate, recipient-card, modal to CSS modules"
```

---

### Task 7: Distribute Secret Santa theme into component modules

Delete `themes/secret-santa.css` and distribute its rules.

**Files:**
- Delete: `assets/styles/themes/secret-santa.css`
- Modify: `assets/styles/exchange/layout.css` (add global secret santa layout rules)
- Modify: `assets/styles/exchange/components/household.module.css` (add .household secret santa variants)
- Modify: `assets/styles/exchange.css` (remove theme import)

- [ ] **Step 1: Add Secret Santa layout rules to exchange/layout.css**

Append to `assets/styles/exchange/layout.css`:

```css
/* Secret Santa Mode Layout */
#left-container.secret {
  flex: 1 1 0%;
  min-width: 0;
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

#left-container.secret #name-list,
#left-container.secret .ghost-house {
  width: 333px;
  margin: 10px;
  box-sizing: border-box;
}

#left-container.secret #name-list .name-container:empty {
  min-height: 0;
}

#left-container.secret #name-list select {
  margin-top: 15px;
}
```

Note: `#name-list`, `.ghost-house`, and `.name-container` are all global (IDs or classes defined in global CSS). The `.secret` class is toggled on `#left-container` by `Instructions.js`.

- [ ] **Step 2: Add Secret Santa household variants to household.module.css**

Append to `assets/styles/exchange/components/household.module.css`:

```css
/* Secret Santa Mode */
:global(#left-container.secret) .household {
  width: 333px;
  margin: 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

:global(#left-container.secret) .household .nameContainer {
  flex: 1;
}

:global(#left-container.secret) .household select {
  width: 100%;
}
```

- [ ] **Step 3: Remove theme import from exchange.css**

In `assets/styles/exchange.css`, delete:
```css
/* Themes */
@import './themes/secret-santa.css';
```

- [ ] **Step 4: Delete the theme file**

```bash
rm assets/styles/themes/secret-santa.css
rmdir assets/styles/themes
```

- [ ] **Step 5: Verify build**

```bash
npx vite build
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "refactor: distribute secret-santa theme into layout.css and household module"
```

---

### Task 8: Update entry point CSS files + keep global component imports

The entry point CSS files need to import any component CSS that was kept global (recipient-search, sidebar).

**Files:**
- Modify: `assets/styles/exchange.css`
- Modify: `assets/styles/dashboard.css`

- [ ] **Step 1: Update exchange.css**

Final contents of `assets/styles/exchange.css`:

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

/* Exchange (global only — modules are imported by JS) */
@import './exchange/base.css';
@import './exchange/layout.css';
@import './exchange/components/recipient-search.css';
@import './exchange/responsive.css';
```

- [ ] **Step 2: Update dashboard.css**

Final contents of `assets/styles/dashboard.css`:

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

/* Dashboard (global only — modules are imported by JS) */
@import './dashboard/base.css';
@import './dashboard/components/sidebar.css';
@import './dashboard/responsive.css';
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "refactor: update CSS entry points for module migration"
```

---

### Task 9: Build, verify, and clean up

- [ ] **Step 1: Clean dist and rebuild**

```bash
rm -rf dist && npx vite build
```

Expected: build succeeds with no errors.

- [ ] **Step 2: Verify CSS bundle contains module styles**

```bash
grep -c 'generateGlow\|resultsCard\|sendEmails\|household\|exchangeResult\|wishlistEntry\|recipientReveal' dist/assets/*.css
```

Expected: match count > 0 — confirming module classes (hashed) are in the bundle.

- [ ] **Step 3: Verify no conflicting global .button in bundle**

```bash
grep -o '\.button[^a-zA-Z_-]' dist/assets/*.css | head -5
```

Expected: no unhashed `.button` selector — both are now module-scoped with hashed names.

- [ ] **Step 4: Verify dev server works**

```bash
rm -rf dist
```

Start the dev server and verify:
1. Exchange page: buttons are correctly sized (Let's Go and Secret Santa same size, Add Name next to input, Delete House full width)
2. Dashboard page: all sections render correctly
3. Organizer form: no box-in-box styling
4. Secret Santa mode: households display correctly in flex layout

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: complete CSS modules migration — fix cross-page style conflicts"
```

---

### Task 10: CSS deduplication review

Review all CSS files for duplication that could be streamlined or moved into global CSS.

- [ ] **Step 1: Audit for duplicate properties across modules**

Read all CSS module files and global CSS files. Look for:
- Identical property blocks repeated across exchange and dashboard modules
- Glass card styling (background, border, border-radius, backdrop-filter, box-shadow) duplicated in multiple files
- Color values that should use design tokens but don't
- Button base styles shared between exchange and dashboard that could be extracted to a global base
- Animation definitions duplicated across files

- [ ] **Step 2: Document findings**

Create a report listing:
- Each instance of duplication
- Recommendation: extract to global CSS, create shared module, or leave as-is
- Priority: which deduplications would reduce the most code

- [ ] **Step 3: Implement agreed-upon changes**

Based on the review findings, extract shared styles into global CSS where appropriate. Common candidates:
- Glass card mixin (shared background/border/blur pattern)
- Base button reset (shared between exchange and dashboard button modules)
- Spacing/layout tokens

- [ ] **Step 4: Verify build**

```bash
rm -rf dist && npx vite build
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "refactor: deduplicate CSS after module migration"
```
