# Exchange Page Animations

## Summary

Add entrance and interaction animations to the exchange page to match the polish of the secondary pages (reuse, wishlist edit/view). Five animation points:

1. **Page entrance** — `#container` fades + slides up on load
2. **House card added** — new `.household` fades + slides up when "Add Group" is clicked
3. **Name entry added** — new `.name-wrapper` fades + slides up when a participant is added
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

Same keyframes already defined in `pages.css` for secondary pages. Define them in `reset.css` so the exchange page gets them too.

### 2. House Card Added (`cardSlide`)

Add to `household.css`:

```css
.household {
  animation: cardSlide 0.5s ease-out both;
}

@keyframes cardSlide {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
```

The animation triggers naturally because each `.household` div is freshly inserted into the DOM by `House.js` via `pushHTML()`. No JS changes needed — the CSS animation runs on element insertion.

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
// In the row template, add inline animation-delay
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

**JS changes in `Instructions.js`:** The `renderInstructions` function needs to:

1. Add `overflow: hidden` to `#intro` (CSS, not JS — already has it implicitly via border-radius)
2. Apply `slideOutLeft` animation class to the `<p>` element
3. On animation end, swap the text content and apply `slideInRight`

```js
function renderInstructions({step}) {
  const introDiv = selectElement(`#${introId}`);
  if (!introDiv) return;
  const paragraph = introDiv.querySelector('p') || introDiv;

  // If no existing content, just render directly
  if (!paragraph.textContent.trim()) {
    introDiv.innerHTML = `<p class="slide-in-right">${instructions[step - 1]}</p>`;
    return;
  }

  // Animate out, then swap and animate in
  paragraph.classList.add('slide-out-left');
  paragraph.addEventListener('animationend', () => {
    introDiv.innerHTML = `<p class="slide-in-right">${instructions[step - 1]}</p>`;
  }, {once: true});
}
```

CSS classes:

```css
#intro { overflow: hidden; }
.slide-out-left { animation: slideOutLeft 0.3s ease-in forwards; }
.slide-in-right { animation: slideInRight 0.3s ease-out both; }
```

The first render (on `EXCHANGE_STARTED`) slides in from right. Subsequent step changes do the full slide-out-left → slide-in-right transition.

## Shared Keyframes Strategy

`cardSlide` is used by houses, name entries, and result rows. Define it once in a shared location. Two options:

- **Option A:** Define in `entries.css` (already imported by both `main.css` and `pages.css`) — all components that need it already have access.
- **Option B:** Create a new `animations.css` with all shared keyframes.

**Decision:** Option A — define `cardSlide` and `pageReveal` in `entries.css` since it's already shared. Define instruction-specific keyframes (`slideOutLeft`, `slideInRight`) in `reset.css` alongside `#intro` styles.

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
- `public/css/base/reset.css` — `pageReveal` on `#container`, `slideOutLeft`/`slideInRight` keyframes, `#intro` overflow
- `public/css/components/entries.css` — `cardSlide` keyframes, `.entry-row` animation
- `public/css/components/household.css` — `.household` animation using `cardSlide`
- `public/css/components/table.css` — `.result-row` animation using `cardSlide`

### JS
- `src/exchange/components/ResultsTable.js` — add stagger delay to row template
- `src/exchange/components/Instructions.js` — animate out/in on step change

## Testing

- **Unit tests:** `Instructions.spec.js` needs updates for the animation behavior (animationend event). Use `element.dispatchEvent(new Event('animationend'))` to trigger the callback in tests.
- **No new test files needed** — all changes are in existing components.
- **Visual verification:** Check all animations in browser after implementation.
- **Edge cases:**
  - First instruction render (no previous text to animate out)
  - Rapid step clicking (animation should complete or be interrupted cleanly)
  - Secret Santa mode (results table not shown — no animation needed)
