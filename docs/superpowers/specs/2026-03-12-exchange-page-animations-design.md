# Exchange Page Animations

## Summary

Add entrance and interaction animations to the exchange page to match the polish of the secondary pages (reuse, wishlist edit/view). Five animation points:

1. **Page entrance** — `#container` fades + slides up on load
2. **House card added** — new `.household` fades + slides up when "Add Group" is clicked
3. **Name entry added** — `.entry-row` elements fade + slide up when a participant is added
4. **Results rows revealed** — result rows appear with staggered delays after generation
5. **Instructions step change** — old text fades + slides left, new text fades + slides in from right

## Design

### 1. Page Entrance (`pageReveal`)

Add to `reset.css`:

```css
#container {
  animation: pageReveal 0.6s ease-out;
}

@keyframes pageReveal {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Same keyframes already defined in `pages.css` for secondary pages. Duplicating in `reset.css` keeps the exchange page self-contained (exchange loads `main.css` → `reset.css`; secondary pages load `pages.css` which has its own copy).

### 2. House Card Added (`cardSlide`)

Add to `household.css`:

```css
.household {
  animation: cardSlide 0.5s ease-out both;
}
```

The `cardSlide` keyframes are defined in `entries.css` (see Shared Keyframes Strategy below). The animation triggers naturally because each `.household` div is freshly inserted into the DOM by `House.js` via `pushHTML()`. No JS changes needed — the CSS animation runs on element insertion.

### 3. Name Entry Added

Add to `entries.css`:

```css
.entry-row {
  animation: cardSlide 0.4s ease-out both;
}
```

Reuses the `cardSlide` keyframes. Slightly shorter duration (0.4s) since name rows are smaller elements and should feel snappy.

**Consideration:** `Name.js` re-renders the entire slot via `innerHTML` on every add/remove. This means all name rows re-animate on each change, not just the new one. Two approaches:

- **Accept the full re-render animation** — all rows do a quick fade+slide. Since 0.4s is fast, this reads as a smooth list refresh rather than jarring flicker. This is the simpler approach.
- **Animate only the new row** — would require changing `Name.js` to append individual rows instead of replacing `innerHTML`. More invasive change.

**Decision:** Start with the full re-render approach. If it looks odd with many names, we can revisit.

### 4. Results Rows (Staggered Reveal)

Add to `table.css`:

```css
.result-row {
  animation: cardSlide 0.4s ease-out both;
}
```

Add stagger delays dynamically in `ResultsTable.js` when rendering rows:

```js
// In the row template, add inline animation-delay based on loop index
html += `<div class="result-row" style="animation-delay: ${i * 0.07}s">...`;
```

Each row gets an additional 70ms delay, creating a cascade effect. For a typical 5-person exchange, the full reveal takes ~0.75s (0.4s animation + 4 × 0.07s stagger).

### 5. Instructions Step Change (Slide-Through with Fade)

New keyframes in `reset.css` (where `#intro` is styled):

```css
@keyframes slideOutLeft {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(-40px); }
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
```

**CSS classes (in `reset.css`):**

```css
#intro { overflow: hidden; }
.slide-out-left { animation: slideOutLeft 0.3s ease-in forwards; }
.slide-in-right { animation: slideInRight 0.3s ease-out both; }
```

Note: `overflow: hidden` must be explicitly set — `border-radius` does NOT imply overflow clipping. Without it, the slide-left animation would show text overflowing outside the rounded container.

**JS changes in `Instructions.js`:**

The first render (on `EXCHANGE_STARTED`) replaces the full intro content (paragraphs, ordered list, "Let's go!" buttons) with step instructions. Since the initial `#intro` content is rich (multiple elements, not just a `<p>`), the first transition animates the entire `#intro` container, not just a child element. Subsequent step changes animate the `<p>` element.

```js
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
```

Key behaviors:
- **First render** (`EXCHANGE_STARTED`): The initial intro content (paragraphs, ol, buttons) has no `.slide-in-right` paragraph, so it's replaced directly with the new `<p>` that slides in from right.
- **Subsequent steps** (`NEXT_STEP`): The existing `<p class="slide-in-right">` is found, animated out left, then replaced with the new step text sliding in from right.
- **Rapid clicking guard**: The `animating` flag prevents a second step change from firing while a transition is in progress. The click is dropped, and the current animation completes normally.

**Note on `#intro`'s `transition: height 1s`:** The existing `transition: height 1s` in `reset.css` controls the intro box's collapse/expand behavior. When the first render replaces the rich intro content with a single `<p>`, the height change will animate over 1s. This is actually a nice effect — the box smoothly shrinks as the instructions take over. If it feels too slow, the transition duration can be reduced during implementation.

## Shared Keyframes Strategy

`cardSlide` is used by houses, name entries, and result rows. Define the keyframes once in `entries.css`, which is already imported by both `main.css` and `pages.css`:

```css
/* In entries.css */
@keyframes cardSlide {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

Remove the duplicate `cardSlide` definition from `pages.css` (lines 82-85) since `entries.css` is now the canonical location.

Other keyframes are page-specific:
- `pageReveal` — defined in `reset.css` for exchange page, already in `pages.css` for secondary pages
- `slideOutLeft` / `slideInRight` — defined in `reset.css` (only used by exchange page instructions)

## Accessibility

Add a `prefers-reduced-motion` media query to disable animations for users who request reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Place this in `tokens.css` so it applies globally to both the exchange page (`main.css` imports `tokens.css`) and secondary pages (`pages.css` imports `tokens.css`). Single definition, no duplication.

## Animation Durations Summary

| Animation | Duration | Easing | Delay |
|-----------|----------|--------|-------|
| Page entrance | 0.6s | ease-out | none |
| House card | 0.5s | ease-out | none |
| Name entry | 0.4s | ease-out | none |
| Result row | 0.4s | ease-out | n × 70ms |
| Instructions out | 0.3s | ease-in | none |
| Instructions in | 0.3s | ease-out | none |

## Files Changed

### CSS
- `public/css/base/tokens.css` — `prefers-reduced-motion` query (shared by all pages)
- `public/css/base/reset.css` — `pageReveal` keyframes + `#container` animation, `slideOutLeft`/`slideInRight` keyframes + classes, `#intro` overflow hidden
- `public/css/components/entries.css` — `cardSlide` keyframes (shared), `.entry-row` animation
- `public/css/components/household.css` — `.household` animation using `cardSlide`
- `public/css/components/table.css` — `.result-row` animation using `cardSlide`
- `public/css/pages.css` — remove duplicate `cardSlide` keyframes (now in `entries.css`)

### JS
- `src/exchange/components/ResultsTable.js` — add stagger delay to row template
- `src/exchange/components/Instructions.js` — animate out/in on step change with rapid-click guard

## Testing

- **Unit tests:** `Instructions.spec.js` needs updates for the animation behavior (`animationend` event). Use `element.dispatchEvent(new Event('animationend'))` to trigger the callback in jsdom tests.
- **No new test files needed** — all changes are in existing components.
- **Visual verification:** Check all animations in browser after implementation.
- **Edge cases:**
  - First instruction render replaces rich intro content (no slide-out, just slide-in)
  - Rapid step clicking is guarded by `animating` flag — extra clicks are dropped
  - Rapid-click guard test: call `renderInstructions` twice without dispatching `animationend` in between — verify second call is dropped
  - Secret Santa mode — results table not shown, no animation needed
  - `#name-list` container (participants list) does NOT get an entrance animation — it appears with the page via `pageReveal`. Only dynamically-added `.household` cards get `cardSlide`.
- **Known limitation:** If `#intro` is removed from the DOM mid-animation, `animationend` never fires and the `animating` flag stays `true`. This is unlikely in practice since nothing removes `#intro` during the exchange flow.
