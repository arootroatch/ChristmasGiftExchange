# Animation Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three animation issues: only animate newly added names (not all), refactor Instructions.js to be a full component (eliminating layout shift), and scroll to new house cards.

**Architecture:** Name animation fix adds `.animated` CSS modifier class, applied only to the newly added entry after full re-render. Instructions refactor moves `#intro` content from `index.html` into `Instructions.js` as a slot-based component (matching RecipientSearch/ReuseLink pattern), with a separate `render()` export for test re-initialization. House scroll adds `scrollIntoView()` after DOM insertion.

**Tech Stack:** Vanilla JS, CSS animations, Vitest + jsdom

---

## Chunk 1: Name Animation Fix

### Task 1: Only animate newly added names

The problem: `Name.js` re-renders the entire slot via `innerHTML` on every add/remove, so all `.entry-row` elements re-animate. The fix: move the animation from the base `.entry-row` class to an `.entry-row.animated` modifier, and add the `animated` class only to the newly added entry after the full re-render completes.

The `PARTICIPANT_ADDED` event payload already includes `{name, participant, ...state}` (confirmed in `state.js` line 110), so we can use `name` to identify the new entry.

**Files:**
- Modify: `public/css/components/entries.css`
- Modify: `src/exchange/components/Name.js`
- Modify: `spec/exchange/components/Name.spec.js`

- [ ] **Step 1: Add CSS modifier class for animated entry rows**

In `public/css/components/entries.css`, remove `animation: cardSlide 0.4s ease-out both;` from `.entry-row` and add a new `.entry-row.animated` rule:

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
}

.entry-row.animated {
  animation: cardSlide 0.4s ease-out both;
}
```

- [ ] **Step 2: Write failing test for single-name animation**

Add to `spec/exchange/components/Name.spec.js` inside the existing `describe('addName')` block (which already has `initReactiveSystem()` in `beforeAll` and `resetState()` in `beforeEach`):

```js
it("adds animated class only to the newly added name", () => {
  addNamesToDOM("Alice");
  addNamesToDOM("Bob");

  const alice = document.querySelector('#wrapper-Alice');
  const bob = document.querySelector('#wrapper-Bob');

  expect(alice.classList.contains('animated')).toBe(false);
  expect(bob.classList.contains('animated')).toBe(true);
});
```

Note: `addNamesToDOM` (already imported in this file) sets the input value and clicks the add button, which triggers `addParticipant` in state and causes the reactive re-render. The DOM must be set up with `initReactiveSystem()` and `resetState()` for the name-list slot to exist. Both Alice and Bob elements are queried AFTER both adds, so references are fresh (innerHTML re-render destroys and recreates elements).

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run spec/exchange/components/Name.spec.js`

Expected: FAIL

- [ ] **Step 4: Implement the fix in Name.js**

The approach: keep the full re-render via `innerHTML` (preserves existing behavior), then after re-render, find the newly added name's wrapper and add the `animated` class. This way only the new entry animates.

Replace `src/exchange/components/Name.js`:

```js
import {ExchangeEvents as Events, exchangeEvents as stateEvents, removeParticipant, nextNameNumber} from "../state.js";
import {participantsId, selectElement, escapeAttr} from "../../utils.js";

export function init() {
  stateEvents.on(Events.PARTICIPANT_ADDED, ({name: addedName, houses, participants}) => {
    renderParticipantsSlot(houses, participants);
    animateNewEntry(addedName);
  });
  stateEvents.on(Events.PARTICIPANT_REMOVED, ({houses, participants}) => renderParticipantsSlot(houses, participants));
  stateEvents.on(Events.NAME_ADDED_TO_HOUSE, ({houseID, members, houses, participants}) => {
    renderHouseSlot(houseID, members);
    renderParticipantsSlot(houses, participants);
  });
  stateEvents.on(Events.NAME_REMOVED_FROM_HOUSE, ({houseID, members, houses, participants}) => {
    renderHouseSlot(houseID, members);
    renderParticipantsSlot(houses, participants);
  });
}

function animateNewEntry(name) {
  const safe = escapeAttr(name);
  const wrapper = selectElement(`#wrapper-${safe}`);
  if (wrapper) wrapper.classList.add('animated');
}

function renderHouseSlot(houseID, members) {
  const slot = selectElement(`[data-slot="names-${houseID}"]`);
  if (slot) renderIntoSlot(slot, members);
}

function renderParticipantsSlot(houses, participants) {
  const slot = selectElement(`[data-slot="names-${participantsId}"]`);
  if (!slot) return;
  const namesInHouses = houses.flatMap(h => h.members);
  const names = participants
    .map(p => p.name)
    .filter(name => !namesInHouses.includes(name));
  renderIntoSlot(slot, names);
}

function renderIntoSlot(slot, names) {
  slot.innerHTML = names.map(name => template(name)).join('');
  attachListeners(slot);
}

function template(name) {
  const id = nextNameNumber();
  const safe = escapeAttr(name);
  return `
      <div class="name-wrapper entry-row" id="wrapper-${safe}" draggable="true">
        <span class="name-entered" id="${safe}${id}">${safe}</span>
        <button id="delete-${safe}${id}" class="delete-btn">&#10005;</button>
      </div>`;
}

function attachListeners(container) {
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (event) => {
      const name = event.currentTarget.previousElementSibling.textContent;
      removeParticipant(name);
    });
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run spec/exchange/components/Name.spec.js`

Expected: PASS

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add public/css/components/entries.css src/exchange/components/Name.js spec/exchange/components/Name.spec.js
git commit -m "fix: only animate newly added name entries"
```

---

## Chunk 2: Instructions Refactor

### Task 2: Refactor Instructions.js to a full slot-based component

Move `#intro` content from `index.html` into `Instructions.js`. The component renders the intro (with buttons) into `[data-slot="instructions"]` on `init()`, matching the pattern used by RecipientSearch and ReuseLink. Button click handlers move from `index.js` into Instructions.js. This eliminates layout shift because all three top components render at the same time.

**Key design decisions:**
- `init()` calls `render()` + subscribes to events (called once in app and once in `initReactiveSystem`)
- `render()` is exported separately — renders intro template + attaches button handlers. Tests call `render()` in `beforeEach` after `resetDOM()` to re-populate the slot without duplicating event subscriptions.
- `secretSantaMode()` moves from `index.js` to `Instructions.js` (exported for `layout.spec.js` tests)

**Files:**
- Modify: `index.html` — replace `#intro` div with `<div data-slot="instructions"></div>`
- Modify: `src/exchange/components/Instructions.js` — add `introTemplate()`, `render()`, `attachButtonHandlers()`, `secretSantaMode()`
- Modify: `src/exchange/index.js` — remove `secretSantaMode` export and button handler code
- Modify: `spec/exchange/components/Instructions.spec.js` — add intro rendering tests, call `render()` in `beforeEach`
- Modify: `spec/exchange/index.spec.js` — remove `startExchange` from state mock, add Instructions and ReuseLink mocks, add `instructions.init` and `reuseLink.init` to ordering test
- Modify: `spec/exchange/layout.spec.js` — import `secretSantaMode` from Instructions.js instead of index.js, call `render()` in `beforeEach` instead of manual button setup

- [ ] **Step 1: Write failing tests for slot-based rendering**

Replace `spec/exchange/components/Instructions.spec.js`:

```js
import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {init as initInstructions, render as renderInstructions, resetAnimating} from "../../../src/exchange/components/Instructions";
import {nextStep} from "../../../src/exchange/state";
import {resetDOM, resetState} from "../../specHelper";

describe("instructions", () => {
  beforeAll(() => {
    initInstructions();
  });

  beforeEach(() => {
    resetDOM();
    resetAnimating();
    renderInstructions();
  });

  describe("intro rendering", () => {
    it("renders intro content into the instructions slot on init", () => {
      const slot = document.querySelector('[data-slot="instructions"]');
      expect(slot.querySelector("#intro")).not.toBeNull();
      expect(slot.innerHTML).toContain("Drawing names for a gift exchange");
    });

    it("renders Let's go button", () => {
      expect(document.querySelector("#letsGo")).not.toBeNull();
    });

    it("renders Secret Santa button", () => {
      expect(document.querySelector("#secretSantaBtn")).not.toBeNull();
    });
  });

  describe("step instructions", () => {
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

      const oldP = document.querySelector("#intro p");
      expect(oldP.classList.contains("slide-out-left")).toBe(true);
      expect(oldP.textContent).toContain("Step 1 / 4");

      oldP.dispatchEvent(new Event("animationend"));

      const newP = document.querySelector("#intro p");
      expect(newP.innerHTML).toContain("Step 2 / 4");
      expect(newP.classList.contains("slide-in-right")).toBe(true);
    });

    it("drops rapid clicks while animating", () => {
      resetState();
      nextStep(3);

      const oldP = document.querySelector("#intro p");
      nextStep(3);

      expect(oldP.classList.contains("slide-out-left")).toBe(true);
      expect(oldP.textContent).toContain("Step 1 / 4");

      oldP.dispatchEvent(new Event("animationend"));

      const newP = document.querySelector("#intro p");
      expect(newP.innerHTML).toContain("Step 2 / 4");
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/exchange/components/Instructions.spec.js`

Expected: FAIL — `render` export doesn't exist, no `[data-slot="instructions"]` in DOM.

- [ ] **Step 3: Update index.html**

Replace the `#intro` div (lines 36-65) with a slot. The HTML should change from:

```html
    </div>
    <div id="intro" class="closed">
        ...all the intro content...
    </div>
    <div id="flex-div">
```

To:

```html
    </div>
    <div data-slot="instructions"></div>
    <div id="flex-div">
```

- [ ] **Step 4: Update Instructions.js**

Replace `src/exchange/components/Instructions.js`:

```js
import {ExchangeEvents as Events, exchangeEvents as stateEvents, startExchange} from "../state.js";
import {leftContainerId, selectElement} from "../../utils.js";

export const instructions = [
  `<span style="font-weight:bold">Step 1 / 4:</span> Enter the names of everyone participating in the gift exchange. Make sure all names are unique. If two people have the same name, please add a last initial or nickname.`,
  `<span style="font-weight:bold">Step 2 / 4</span> (optional): Who should NOT get who? <br><br>For example, a couple may not want to be able to get each other's names at the family gift exchange because they will already be getting each other gifts outside the exchange. <br><br> In that case, you can put them in an exclusion group together. Names in the same group will not get each other as recipients.<br><br> Click "Add Group." Then,  you can drag and drop to move people around or select their name from the drop-down in each box.`,
  `<span style="font-weight:bold">Step 3 / 4:</span> Click "Generate List!"`,
];

const introId = "intro";
let animating = false;

function introTemplate() {
  return `<div id="${introId}">
    <p>
      Drawing names for a gift exchange or Secret Santa? Here's a
      web app to make it easier! <br><br>
      Simply:
    </p>
    <ol>
      <li>Add all participant names</li>
      <li>Sort people into exclusion groups (optional)</li>
      <li>Generate the list</li>
      <li>Send everyone an email with the name of their recipient (optional)</li>
    </ol>
    <p>
      To keep the results a secret, click
      "Secret Santa Mode" instead.
    </p>
    <p>
      This site will always be free to use, doesn't use any cookies, and your information will never be shared.
    </p>
    <div id="get-started">
      <p>Ready to get started?</p>
      <button class="button" id="letsGo" style="margin-bottom: 0;">Let's go!</button>
      <button class="btn-bottom" id="secretSantaBtn">Secret Santa Mode</button>
    </div>
  </div>`;
}

export function secretSantaMode() {
  selectElement(`#${leftContainerId}`).classList.add("secret");
  startExchange(true);
}

function attachButtonHandlers() {
  const letsGo = selectElement("#letsGo");
  const secretSantaBtn = selectElement("#secretSantaBtn");
  if (letsGo) letsGo.onclick = () => startExchange(false);
  if (secretSantaBtn) secretSantaBtn.onclick = secretSantaMode;
}

function renderStepInstructions({step}) {
  if (!step || step < 1 || step > instructions.length) return;
  const introDiv = selectElement(`#${introId}`);
  if (!introDiv) return;

  const newContent = `<p class="slide-in-right">${instructions[step - 1]}</p>`;
  const paragraph = introDiv.querySelector('p.slide-in-right');

  if (!paragraph) {
    introDiv.innerHTML = newContent;
    return;
  }

  if (animating) return;
  animating = true;

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

export function render() {
  const slot = selectElement('[data-slot="instructions"]');
  if (slot) {
    slot.innerHTML = introTemplate();
    attachButtonHandlers();
  }
}

export function init() {
  render();
  stateEvents.on(Events.EXCHANGE_STARTED, renderStepInstructions);
  stateEvents.on(Events.NEXT_STEP, renderStepInstructions);
}
```

Key changes from previous version:
- `render()` exported separately — renders intro + attaches button handlers
- `init()` calls `render()` + subscribes to events
- `secretSantaMode()` exported (moved from index.js)
- Internal function renamed to `renderStepInstructions` to avoid confusion with `render`

- [ ] **Step 5: Update index.js**

Replace `src/exchange/index.js`:

```js
import {initDragDrop} from "./dragDrop.js";
import * as house from "./components/House.js";
import * as name from "./components/Name.js";
import * as nameList from "./components/NameList.js";
import * as select from "./components/Select.js";
import * as resultsTable from "./components/ResultsTable.js";
import * as controlStrip from "./components/ControlStrip/ControlStrip.js";
import * as nextStepButton from "./components/ControlStrip/NextStepButton.js";
import * as addHouseButton from "./components/ControlStrip/AddHouseButton.js";
import * as generateButton from "./components/ControlStrip/GenerateButton.js";
import * as instructions from "./components/Instructions.js";
import * as emailTable from "./components/EmailTable/EmailTable.js";
import * as recipientSearch from "./components/RecipientSearch.js";
import * as reuseLink from "./components/ReuseLink.js";
import * as snackbar from "../Snackbar.js";
import {loadExchange} from "./state.js";

export default function main() {
  snackbar.init();
  house.init();
  name.init();
  nameList.init();
  select.init();
  resultsTable.init();
  controlStrip.init();
  nextStepButton.init();
  addHouseButton.init();
  generateButton.init();
  instructions.init();

  emailTable.init();
  recipientSearch.init();
  reuseLink.init();

  initDragDrop();

  const reuseData = sessionStorage.getItem("reuseExchange");
  if (reuseData) {
    sessionStorage.removeItem("reuseExchange");
    loadExchange(JSON.parse(reuseData));
  }

  const snackbarError = sessionStorage.getItem("snackbarError");
  if (snackbarError) {
    sessionStorage.removeItem("snackbarError");
    snackbar.showError(snackbarError);
  }
}
```

Removed: `secretSantaMode` function/export, button handler lines, `startExchange` import, `selectElement` import, `leftContainerId` import.

- [ ] **Step 6: Update layout.spec.js**

In `spec/exchange/layout.spec.js`:

1. Change `secretSantaMode` import from `../../src/exchange/index` to `../../src/exchange/components/Instructions`
2. Import `render as renderInstructions` from Instructions.js
3. In `beforeEach`, after `resetDOM()`, call `renderInstructions()` to re-populate the intro (with buttons)
4. Remove manual button handler setup (lines 18-19: `letsGoBtn.onclick = ...` and `secretSantaBtn.onclick = ...`) — `renderInstructions()` now calls `attachButtonHandlers()` internally

```js
import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {addParticipant, getState, startExchange} from '../../src/exchange/state';
import {initReactiveSystem, resetDOM} from "../specHelper";
import {secretSantaMode, render as renderInstructions} from "../../src/exchange/components/Instructions";

describe('layout', () => {
  let letsGoBtn, secretSantaBtn, leftContainer;

  beforeAll(async () => {
    initReactiveSystem();
  });

  beforeEach(() => {
    resetDOM();
    renderInstructions();
    letsGoBtn = document.querySelector("#letsGo");
    secretSantaBtn = document.querySelector("#secretSantaBtn");
    leftContainer = document.querySelector("#left-container");
    leftContainer.classList.remove("secret");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('secretSantaMode', () => {
    it('sets secretSanta state to true', () => {
      secretSantaMode();

      expect(getState().isSecretSanta).toBe(true);
    });

    it('adds secret class to left-container', () => {
      expect(leftContainer.classList).not.toContain('secret');

      secretSantaMode();

      expect(leftContainer.classList).toContain('secret');
    });

    it('does not render results-table in secret santa mode', () => {
      secretSantaMode();

      const resultsTable = document.querySelector("#results-table");
      expect(resultsTable).toBeNull();
    });
  });

  describe('event listeners', () => {

    it('letsGo button has click listener attached', () => {
      letsGoBtn.click();

      const nameList = document.querySelector("#name-list");
      expect(nameList.style.display).toBe('block');
    });

    it('secretSantaBtn button has click listener attached', () => {
      expect(getState().isSecretSanta).toBe(false);

      secretSantaBtn.click();

      expect(getState().isSecretSanta).toBe(true);
    });

    it('nextStep button has click listener attached', () => {
      startExchange(false);
      addParticipant("Alex");
      const nextStepBtn = document.querySelector("#nextStep");

      nextStepBtn.click();

      expect(getState().step).toBeGreaterThan(1);
    });
  });
});
```

- [ ] **Step 7: Update index.spec.js**

Make these changes to `spec/exchange/index.spec.js`:

**7a. Add mocks** — Add these two mocks alongside the existing component mocks (after the RecipientSearch mock):

```js
vi.mock('../../src/exchange/components/Instructions', () => ({
  init: vi.fn(),
}));

vi.mock('../../src/exchange/components/ReuseLink', () => ({
  init: vi.fn(),
}));
```

**7b. Remove `startExchange` from state mock** — Change the state mock from:
```js
vi.mock('../../src/exchange/state', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    startExchange: vi.fn(),
    loadExchange: vi.fn(),
  };
});
```
To:
```js
vi.mock('../../src/exchange/state', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    loadExchange: vi.fn(),
  };
});
```

**7c. Add individual init tests** — Add these after the `recipientSearch.init` test:

```js
it('calls instructions.init', async () => {
  const {init} = await import('../../src/exchange/components/Instructions');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});

it('calls reuseLink.init', async () => {
  const {init} = await import('../../src/exchange/components/ReuseLink');

  main();

  expect(init).toHaveBeenCalledTimes(1);
});
```

**7d. Update ordering test** — In the `'calls all initialization functions in order'` test, add these imports:
```js
const instructions = await import('../../src/exchange/components/Instructions');
const reuseLink = await import('../../src/exchange/components/ReuseLink');
```

Add these assertions:
```js
expect(instructions.init).toHaveBeenCalledTimes(1);
expect(reuseLink.init).toHaveBeenCalledTimes(1);
```

Add these order variables:
```js
const instructionsOrder = instructions.init.mock.invocationCallOrder[0];
const reuseLinkOrder = reuseLink.init.mock.invocationCallOrder[0];
```

Add these order assertions (instructions after generate, before emailTable; reuseLink after recipientSearch, before dragDrop):
```js
expect(generateOrder).toBeLessThan(instructionsOrder);
expect(instructionsOrder).toBeLessThan(emailTableOrder);
expect(recipientSearchOrder).toBeLessThan(reuseLinkOrder);
expect(reuseLinkOrder).toBeLessThan(dragDropOrder);
```

Also update the existing `expect(recipientSearchOrder).toBeLessThan(dragDropOrder)` to `expect(recipientSearchOrder).toBeLessThan(reuseLinkOrder)` since reuseLink now sits between them.

- [ ] **Step 8: Run all tests**

Run: `npx vitest run`

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add index.html src/exchange/components/Instructions.js src/exchange/index.js spec/exchange/components/Instructions.spec.js spec/exchange/index.spec.js spec/exchange/layout.spec.js
git commit -m "refactor: make Instructions a full slot-based component to eliminate layout shift"
```

---

## Chunk 3: House Scroll Into View

### Task 3: Scroll to new house card after adding

When a user clicks "Add Group," the new house card should scroll into view.

**Files:**
- Modify: `src/exchange/components/House.js`
- Modify: `spec/exchange/components/House.spec.js`

- [ ] **Step 1: Mock scrollIntoView in test setup**

jsdom does not implement `scrollIntoView`. Add a mock in the test's `beforeAll` or at the top of the describe block in `spec/exchange/components/House.spec.js`:

```js
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  // ... existing beforeAll code
});
```

- [ ] **Step 2: Write failing test**

Add to `spec/exchange/components/House.spec.js`:

```js
it("scrolls new house into view", () => {
  Element.prototype.scrollIntoView.mockClear();
  addHouseToDOM();

  const houses = document.querySelectorAll('.household');
  const newHouse = houses[houses.length - 1];
  expect(newHouse.scrollIntoView).toHaveBeenLastCalledWith({behavior: 'smooth', block: 'nearest'});
});
```

Note: `mockClear()` resets the shared prototype spy before this test. `toHaveBeenLastCalledWith` ensures the most recent call (the new house) used the correct args, not a call from `beforeEach`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run spec/exchange/components/House.spec.js`

Expected: FAIL — `scrollIntoView` not called.

- [ ] **Step 4: Implement scrollIntoView in House.js**

In `src/exchange/components/House.js`, add a `scrollIntoView` call at the end of `onHouseAdded`:

```js
function onHouseAdded({houseID, houses}) {
  if (!selectElement(`#${leftContainerId}`)) return;
  const house = houses.find(h => h.id === houseID);
  const html = template(houseID, house.name);
  pushHTML(`#${leftContainerId}`, html);
  attachListeners(houseID);
  selectElement(`#${houseID}`)?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run spec/exchange/components/House.spec.js`

Expected: PASS

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/exchange/components/House.js spec/exchange/components/House.spec.js
git commit -m "feat: scroll to new house card after adding"
```
