# Exchange Page Animations Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add entrance and interaction animations to the exchange page matching the polish of the secondary pages.

**Architecture:** CSS-only animations for entrance effects (page, house, name, results), JS-driven animation for instructions step transitions. Shared `cardSlide` keyframes in `entries.css`, page-specific keyframes in `reset.css`. `prefers-reduced-motion` in `tokens.css` for accessibility.

**Tech Stack:** CSS `@keyframes` animations, vanilla JS `animationend` event, Vitest + jsdom

**Spec:** `docs/superpowers/specs/2026-03-12-exchange-page-animations-design.md`

---

## Chunk 1: CSS-Only Animations

These tasks are pure CSS changes — no JS modifications, no test changes needed.

### Task 1: Shared `cardSlide` keyframes and `prefers-reduced-motion`

**Files:**
- Modify: `public/css/components/entries.css`
- Modify: `public/css/base/tokens.css`
- Modify: `public/css/pages.css:82-85`

- [ ] **Step 1: Add `cardSlide` keyframes to `entries.css`**

Append to the end of `public/css/components/entries.css`:

```css
/* Shared animation keyframes */
@keyframes cardSlide {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Remove duplicate `cardSlide` from `pages.css`**

Remove lines 82-85 from `public/css/pages.css` (the `@keyframes cardSlide` block). The `section` and `.exchange-result` rules that reference `cardSlide` will now use the definition from `entries.css` (which `pages.css` imports on line 7).

- [ ] **Step 3: Add `prefers-reduced-motion` to `tokens.css`**

Append to the end of `public/css/base/tokens.css`:

```css
/* Accessibility: respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Verify secondary pages still work**

Run: `npx vitest run`

All tests should pass. The CSS changes don't affect test behavior since jsdom doesn't run CSS animations.

- [ ] **Step 5: Visual verification**

Open the reuse page and wishlist edit page in a browser. Confirm the `cardSlide` entrance animations still work. The keyframes now come from `entries.css` instead of `pages.css`, but the animation declarations on `section` and `.exchange-result` are unchanged.

- [ ] **Step 6: Commit**

```bash
git add public/css/components/entries.css public/css/base/tokens.css public/css/pages.css
git commit -m "refactor: move cardSlide keyframes to entries.css and add prefers-reduced-motion"
```

### Task 2: Page entrance animation

**Files:**
- Modify: `public/css/base/reset.css`

- [ ] **Step 1: Add `pageReveal` keyframes and `#container` animation to `reset.css`**

Add the animation property to the existing `#container` block and add the keyframes after it. Note: `pageReveal` is intentionally duplicated in both `reset.css` (for the exchange page) and `pages.css` (for secondary pages) — do NOT try to deduplicate it like `cardSlide` was.

In the existing `#container` rule (lines 16-18), add the animation property:

```css
#container {
  margin-right: 8px;
  animation: pageReveal 0.6s ease-out;
}
```

Then append the keyframes after the `#container` block:

```css
@keyframes pageReveal {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Visual verification**

Open the exchange page in a browser. The entire `#container` should fade in and slide up over 0.6s on page load.

- [ ] **Step 3: Commit**

```bash
git add public/css/base/reset.css
git commit -m "feat: add page entrance animation to exchange page"
```

### Task 3: House card and name entry animations

**Files:**
- Modify: `public/css/components/household.css`
- Modify: `public/css/components/entries.css`

- [ ] **Step 1: Add `.household` animation to `household.css`**

Add the animation property to the existing `.household` rule (line 22-24) in `public/css/components/household.css`:

```css
.household {
  margin-top: 1rem;
  animation: cardSlide 0.5s ease-out both;
}
```

- [ ] **Step 2: Add `.entry-row` animation to `entries.css`**

Add the animation property to the existing `.entry-row` rule in `public/css/components/entries.css`:

```css
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
  animation: cardSlide 0.4s ease-out both;
}
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`

All tests should pass. CSS animations don't affect jsdom test behavior.

- [ ] **Step 4: Visual verification**

Open the exchange page. Click "Let's go!", add names — each name entry should fade+slide up. Click "Add Group" — the new house card should fade+slide up.

- [ ] **Step 5: Commit**

```bash
git add public/css/components/household.css public/css/components/entries.css
git commit -m "feat: add entrance animations for house cards and name entries"
```

### Task 4: Results table row animation

**Files:**
- Modify: `public/css/components/table.css`

- [ ] **Step 1: Add `.result-row` animation to `table.css`**

Add the animation property to the existing `.result-row` rule in `public/css/components/table.css`:

```css
.result-row {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 6px;
  margin-bottom: 5px;
  animation: cardSlide 0.4s ease-out both;
}
```

Note: The stagger delay is added dynamically in JS (Task 6). For now the CSS base animation is set.

- [ ] **Step 2: Commit**

```bash
git add public/css/components/table.css
git commit -m "feat: add base animation for results table rows"
```

### Task 5: Instructions slide animation CSS

**Files:**
- Modify: `public/css/base/reset.css`

- [ ] **Step 1: Add instruction animation keyframes and classes to `reset.css`**

Add `overflow: hidden` to the existing `#intro` rule in `public/css/base/reset.css` (find the `#intro` selector — note that line numbers may have shifted if Task 2 was applied first):

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
  overflow: hidden;
}
```

Then append the keyframes and utility classes after the `#intro` block:

```css
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
```

- [ ] **Step 2: Commit**

```bash
git add public/css/base/reset.css
git commit -m "feat: add instruction slide animation CSS"
```

---

## Chunk 2: JavaScript Changes + Tests

### Task 6: Results table stagger delay

**Files:**
- Modify: `src/exchange/components/ResultsTable.js:36-47`
- Test: `spec/exchange/components/ResultsTable.spec.js`

- [ ] **Step 1: Write the failing test**

Add a test to `spec/exchange/components/ResultsTable.spec.js` that verifies stagger delays are applied:

```js
it('applies stagger animation-delay to result rows', () => {
  startExchange(false);
  installParticipantNames("Alex", "Whitney", "Hunter");

  assignRecipients(["Whitney", "Hunter", "Alex"]);

  const rows = document.querySelectorAll('.result-row');
  expect(rows[0].style.animationDelay).toBe('');
  expect(rows[1].style.animationDelay).toBe('0.07s');
  expect(rows[2].style.animationDelay).toBe('0.14s');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run spec/exchange/components/ResultsTable.spec.js`

Expected: FAIL — rows have no `style.animationDelay` set.

- [ ] **Step 3: Write minimal implementation**

Change the `for...of` loop in `renderResults` in `src/exchange/components/ResultsTable.js` to use indexed iteration:

```js
function renderResults(assignments) {
  clearTable();
  let html = '';
  for (let i = 0; i < assignments.length; i++) {
    const assignment = assignments[i];
    const delay = i > 0 ? ` style="animation-delay: ${(i * 0.07).toFixed(2)}s"` : '';
    html += `<div class="result-row"${delay}>
                <span>${assignment.giver}</span>
                <span class="result-arrow">&#8594;</span>
                <span>${assignment.recipient}</span>
            </div>`;
  }
  pushHTML(`#${tableBodyId}`, html);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/ResultsTable.spec.js`

Expected: PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/exchange/components/ResultsTable.js spec/exchange/components/ResultsTable.spec.js
git commit -m "feat: add stagger animation-delay to results table rows"
```

### Task 7: Instructions slide animation JS

**Files:**
- Modify: `src/exchange/components/Instructions.js`
- Modify: `spec/exchange/components/Instructions.spec.js`

This is the most complex task. The `renderInstructions` function needs to:
1. On first render (no `.slide-in-right` paragraph exists): directly replace innerHTML
2. On subsequent renders: animate out the old `<p>`, wait for `animationend`, then swap in the new `<p>`
3. Guard against rapid clicking with an `animating` flag

The existing `Instructions.spec.js` tests call `resetState()` which triggers `startExchange()` → emits `EXCHANGE_STARTED` → calls `renderInstructions({step: 1})`. The `resetDOM()` call restores the original `index.html` content in `#intro`. So the first `resetState()` call after `resetDOM()` is always the "first render" path (no `.slide-in-right` paragraph yet).

- [ ] **Step 1: Update existing test for animation-aware behavior**

The existing tests should still pass because the first render (step 1 after `resetDOM`) uses the direct path (no animation, just `innerHTML` replacement). But the second test calls `nextStep(3)` which triggers the animation path — the old `<p>` gets `slide-out-left` and waits for `animationend`. In jsdom, `animationend` never fires automatically, so we need to dispatch it manually.

Replace the contents of `spec/exchange/components/Instructions.spec.js`:

```js
import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {init as initInstructions, instructions} from "../../../src/exchange/components/Instructions";
import {nextStep} from "../../../src/exchange/state";
import {resetDOM, resetState} from "../../specHelper";

describe("instructions", () => {
  beforeAll(() => {
    initInstructions();
  });

  beforeEach(() => {
    resetDOM();
  });

  it("renders Step 1 after exchange starts", () => {
    resetState();
    const intro = document.querySelector("#intro");
    expect(intro.innerHTML).toContain("Step 1 / 4");
  });

  it("applies slide-in-right class on first render", () => {
    resetState();
    const p = document.querySelector("#intro p");
    expect(p.classList.contains("slide-in-right")).toBe(true);
  });

  it("updates content on NEXT_STEP after animationend", () => {
    resetState();
    nextStep(3);

    // Old paragraph should have slide-out-left
    const oldP = document.querySelector("#intro p");
    expect(oldP.classList.contains("slide-out-left")).toBe(true);

    // Content hasn't changed yet (waiting for animationend)
    expect(oldP.textContent).toContain("Step 1 / 4");

    // Dispatch animationend to complete the transition
    oldP.dispatchEvent(new Event("animationend"));

    // Now the new content should be rendered
    const newP = document.querySelector("#intro p");
    expect(newP.innerHTML).toContain("Step 2 / 4");
    expect(newP.classList.contains("slide-in-right")).toBe(true);
  });

  it("drops rapid clicks while animating", () => {
    resetState();
    nextStep(3);

    const oldP = document.querySelector("#intro p");

    // Second nextStep while animation is in progress
    nextStep(3);

    // Still showing step 1 text with slide-out-left
    expect(oldP.classList.contains("slide-out-left")).toBe(true);
    expect(oldP.textContent).toContain("Step 1 / 4");

    // Complete the first animation
    oldP.dispatchEvent(new Event("animationend"));

    // Should show step 2 (not step 3)
    const newP = document.querySelector("#intro p");
    expect(newP.innerHTML).toContain("Step 2 / 4");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/components/Instructions.spec.js`

Expected: The new tests fail — `renderInstructions` doesn't have animation logic yet.

- [ ] **Step 3: Write the implementation**

Replace the contents of `src/exchange/components/Instructions.js`:

```js
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import {selectElement} from "../../utils.js";

export const instructions = [
  `<span style="font-weight:bold">Step 1 / 4:</span> Enter the names of everyone participating in the gift exchange. Make sure all names are unique. If two people have the same name, please add a last initial or nickname.`,
  `<span style="font-weight:bold">Step 2 / 4</span> (optional): Who should NOT get who? <br><br>For example, a couple may not want to be able to get each other's names at the family gift exchange because they will already be getting each other gifts outside the exchange. <br><br> In that case, you can put them in an exclusion group together. Names in the same group will not get each other as recipients.<br><br> Click "Add Group." Then,  you can drag and drop to move people around or select their name from the drop-down in each box.`,
  `<span style="font-weight:bold">Step 3 / 4:</span> Click "Generate List!"`,
];

const introId = "intro";
let animating = false;

function renderInstructions({step}) {
  if (!step || step < 1 || step > instructions.length) return;
  const introDiv = selectElement(`#${introId}`);
  if (!introDiv) return;

  const newContent = `<p class="slide-in-right">${instructions[step - 1]}</p>`;
  const paragraph = introDiv.querySelector('p.slide-in-right');

  // First render or no animated paragraph yet — just replace
  if (!paragraph) {
    introDiv.innerHTML = newContent;
    return;
  }

  // Guard against rapid clicks during animation
  if (animating) return;
  animating = true;

  // Animate out, then swap and animate in
  paragraph.classList.remove('slide-in-right');
  paragraph.classList.add('slide-out-left');
  paragraph.addEventListener('animationend', () => {
    introDiv.innerHTML = newContent;
    animating = false;
  }, {once: true});
}

export function resetAnimating() {
  animating = false;
}

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, renderInstructions);
  stateEvents.on(Events.NEXT_STEP, renderInstructions);
}
```

Note: `resetAnimating()` is exported so tests can reset the module-level flag between test cases. Without it, a test that triggers the animation path without dispatching `animationend` would leave `animating = true` for subsequent tests.

- [ ] **Step 4: Add `resetAnimating` call to test beforeEach**

Update the `beforeEach` in `spec/exchange/components/Instructions.spec.js` to import and call `resetAnimating`:

```js
import {init as initInstructions, instructions, resetAnimating} from "../../../src/exchange/components/Instructions";
```

```js
beforeEach(() => {
  resetDOM();
  resetAnimating();
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/Instructions.spec.js`

Expected: All 4 tests pass.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`

Expected: All tests pass.

- [ ] **Step 7: Visual verification**

Open the exchange page in a browser. Click "Let's go!" — Step 1 instructions should slide in from right. Click "Next Step" — Step 1 text should fade+slide left, Step 2 text should fade+slide in from right. Click "Next Step" again — same transition to Step 3.

- [ ] **Step 8: Commit**

```bash
git add src/exchange/components/Instructions.js spec/exchange/components/Instructions.spec.js
git commit -m "feat: add slide transition animation for instruction step changes"
```
