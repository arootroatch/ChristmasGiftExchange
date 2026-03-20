# Generate Button Progressive Glow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a progressive glow + pulse effect to the Generate List button that intensifies as participants are added, creating a "building toward something" feeling.

**Architecture:** CSS glow classes (`.generate-glow-1/2/3`) with keyframe pulse animations, applied by a pure `getGlowClass(count)` function in GenerateButton.js. A separate `updateGlow()` function handles DOM class application since `render()` early-returns when the button exists. Glow only escalates — never downgrades on participant removal.

**Tech Stack:** Vanilla CSS (keyframes, box-shadow, transitions), Vanilla JS, Vitest + jsdom

**Spec:** `docs/superpowers/specs/2026-03-20-generate-button-progressive-glow-design.md`

---

### Task 1: CSS Glow Classes and Keyframe Animations

**Files:**
- Modify: `public/css/components/buttons.css`

- [ ] **Step 1: Add glow classes and keyframe rules to buttons.css**

Append after the existing `.button:active, .btn-bottom:active` rule block at the end of the file:

```css
/* Generate button progressive glow */
#generate {
  transition: box-shadow 0.4s, background 0.4s;
}

.generate-glow-1 {
  box-shadow: 0 0 8px rgba(142, 58, 59, 0.2);
}

.generate-glow-2 {
  background-color: #7a3233;
  box-shadow: 0 0 20px rgba(142, 58, 59, 0.4);
  animation: generate-pulse-soft 2.5s ease-in-out infinite;
}

.generate-glow-3 {
  background: linear-gradient(135deg, #a84445, #8e3a3b);
  box-shadow: 0 0 30px rgba(168, 68, 69, 0.6), 0 0 60px rgba(168, 68, 69, 0.3);
  animation: generate-pulse-strong 1.8s ease-in-out infinite;
}

@keyframes generate-pulse-soft {
  0%, 100% { box-shadow: 0 0 20px rgba(142, 58, 59, 0.4); }
  50% { box-shadow: 0 0 30px rgba(142, 58, 59, 0.6); }
}

@keyframes generate-pulse-strong {
  0%, 100% { box-shadow: 0 0 30px rgba(168, 68, 69, 0.6), 0 0 60px rgba(168, 68, 69, 0.3); }
  50% { box-shadow: 0 0 40px rgba(168, 68, 69, 0.8), 0 0 80px rgba(168, 68, 69, 0.4); }
}
```

- [ ] **Step 2: Commit**

```bash
git add public/css/components/buttons.css
git commit -m "feat: add CSS glow classes and pulse keyframes for Generate button"
```

---

### Task 2: getGlowClass Pure Function + Tests

**Files:**
- Modify: `src/exchange/components/ControlStrip/GenerateButton.js`
- Modify: `spec/exchange/components/ControlStrip/GenerateButton.spec.js`

- [ ] **Step 1: Write failing tests for getGlowClass**

First, add `getGlowClass` to the existing import on line 19 of `GenerateButton.spec.js`. Change:

```js
import {init as initGenerateButton, generateList} from "../../../../src/exchange/components/ControlStrip/GenerateButton";
```

To:

```js
import {init as initGenerateButton, generateList, getGlowClass} from "../../../../src/exchange/components/ControlStrip/GenerateButton";
```

Then add this describe block before the existing `describe("generateButton", ...)`:

```js
describe("getGlowClass", () => {
  it("returns null for count below 3", () => {
    expect(getGlowClass(0)).toBeNull();
    expect(getGlowClass(1)).toBeNull();
    expect(getGlowClass(2)).toBeNull();
  });

  it("returns generate-glow-1 for 3-4 participants", () => {
    expect(getGlowClass(3)).toBe("generate-glow-1");
    expect(getGlowClass(4)).toBe("generate-glow-1");
  });

  it("returns generate-glow-2 for 5-7 participants", () => {
    expect(getGlowClass(5)).toBe("generate-glow-2");
    expect(getGlowClass(7)).toBe("generate-glow-2");
  });

  it("returns generate-glow-3 for 8+ participants", () => {
    expect(getGlowClass(8)).toBe("generate-glow-3");
    expect(getGlowClass(15)).toBe("generate-glow-3");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Check test autorunner output. Expected: FAIL — `getGlowClass` is not exported from GenerateButton.js.

- [ ] **Step 3: Implement getGlowClass in GenerateButton.js**

Add this exported function after the `const` declarations at the top (after line 12):

```js
const glowClasses = ["generate-glow-1", "generate-glow-2", "generate-glow-3"];

export function getGlowClass(count) {
  if (count >= 8) return glowClasses[2];
  if (count >= 5) return glowClasses[1];
  if (count >= 3) return glowClasses[0];
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Check test autorunner output. Expected: All 4 new tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/exchange/components/ControlStrip/GenerateButton.js spec/exchange/components/ControlStrip/GenerateButton.spec.js
git commit -m "feat: add getGlowClass pure function with threshold logic"
```

---

### Task 3: updateGlow Function + Apply on PARTICIPANT_ADDED

**Files:**
- Modify: `src/exchange/components/ControlStrip/GenerateButton.js`
- Modify: `spec/exchange/components/ControlStrip/GenerateButton.spec.js`

- [ ] **Step 1: Write failing test for glow applied on 3rd participant**

Add this describe block inside the existing `describe("generateButton", ...)`, after the `"generate hint text"` describe block:

```js
describe("progressive glow", () => {
  it("applies generate-glow-1 after 3rd participant", () => {
    resetState();
    addParticipant("Alex");
    addParticipant("Whitney");
    addParticipant("Carol");
    const btn = selectElement("#generate");
    expect(btn.classList.contains("generate-glow-1")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify it fails**

Check test autorunner output. Expected: FAIL — button has no glow class.

- [ ] **Step 3: Implement updateGlow and wire into PARTICIPANT_ADDED handler**

Add the `updateGlow` function in `GenerateButton.js` after `getGlowClass`:

```js
function updateGlow() {
  const btn = selectElement(`#${generateId}`);
  if (!btn) return;
  glowClasses.forEach(cls => btn.classList.remove(cls));
  const cls = getGlowClass(participantCount);
  if (cls) btn.classList.add(cls);
}
```

Then update the `PARTICIPANT_ADDED` handler in `init()` — add `updateGlow()` after the `render()` call. Change:

```js
  stateEvents.on(Events.PARTICIPANT_ADDED, () => {
    participantCount++;
    render();
    if (!hintShown && participantCount >= 3) {
```

To:

```js
  stateEvents.on(Events.PARTICIPANT_ADDED, () => {
    participantCount++;
    render();
    updateGlow();
    if (!hintShown && participantCount >= 3) {
```

- [ ] **Step 4: Run tests to verify it passes**

Check test autorunner output. Expected: PASS.

- [ ] **Step 5: Write test for glow-2 at 5 participants**

Add to the `"progressive glow"` describe block:

```js
  it("applies generate-glow-2 after 5th participant", () => {
    resetState();
    addParticipant("Alex");
    addParticipant("Whitney");
    addParticipant("Carol");
    addParticipant("Dave");
    addParticipant("Eve");
    const btn = selectElement("#generate");
    expect(btn.classList.contains("generate-glow-2")).toBe(true);
    expect(btn.classList.contains("generate-glow-1")).toBe(false);
  });
```

- [ ] **Step 6: Run tests to verify it passes**

Check test autorunner output. Expected: PASS (implementation already handles this).

- [ ] **Step 7: Write test for glow-3 at 8 participants**

Add to the `"progressive glow"` describe block:

```js
  it("applies generate-glow-3 after 8th participant", () => {
    resetState();
    for (const name of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
      addParticipant(name);
    }
    const btn = selectElement("#generate");
    expect(btn.classList.contains("generate-glow-3")).toBe(true);
    expect(btn.classList.contains("generate-glow-2")).toBe(false);
  });
```

- [ ] **Step 8: Run tests to verify it passes**

Check test autorunner output. Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/exchange/components/ControlStrip/GenerateButton.js spec/exchange/components/ControlStrip/GenerateButton.spec.js
git commit -m "feat: apply progressive glow class on PARTICIPANT_ADDED"
```

---

### Task 4: Glow Reset on EXCHANGE_STARTED

**Files:**
- Modify: `spec/exchange/components/ControlStrip/GenerateButton.spec.js`

- [ ] **Step 1: Write test for glow reset on new exchange**

Add to the `"progressive glow"` describe block:

```js
  it("resets glow when new exchange started", () => {
    resetState();
    addParticipant("Alex");
    addParticipant("Whitney");
    addParticipant("Carol");
    expect(selectElement("#generate").classList.contains("generate-glow-1")).toBe(true);
    resetState();
    addParticipant("Alex");
    expect(selectElement("#generate")).not.toBeNull();
    const btn = selectElement("#generate");
    expect(btn.classList.contains("generate-glow-1")).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify it passes**

Check test autorunner output. Expected: PASS — `resetState()` calls `startExchange()` which triggers `EXCHANGE_STARTED`, which already resets `participantCount = 0` and calls `remove()` (destroying the button DOM), so when a new participant is added and `render()` creates a fresh button + `updateGlow()` runs with count=1, no glow class is applied.

- [ ] **Step 3: Commit**

```bash
git add spec/exchange/components/ControlStrip/GenerateButton.spec.js
git commit -m "test: verify glow resets on EXCHANGE_STARTED"
```

---

### Task 5: Verify All Tests Pass and Clean Output

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass, no warnings or errors in output.

- [ ] **Step 2: Check for post-test errors**

Check the full output for any `ERROR`, `SyntaxError`, or `TypeError` messages after the test results. Tests only truly pass if both assertions pass AND no errors appear in output.

- [ ] **Step 3: Manual smoke test (optional)**

Start the dev server (`npm run dev`) and:
1. Click "Let's go!"
2. Add names one at a time — observe the button glow intensify at 3, 5, and 8 names
3. Verify the pulse animation is visible at 5+ and 8+ names
4. Start a new exchange — verify glow resets
