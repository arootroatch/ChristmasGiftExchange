# Generate Button Progressive Glow Design

## Problem

The Generate List button in the control strip doesn't draw enough attention on desktop. It's the main action the app exists for, but it blends in — there's no visual signal that everything the user is doing leads up to pressing it.

## Solution

Add a progressive glow + pulse effect to the Generate button that intensifies as participants are added. The button stays the same size but develops increasingly dramatic visual energy across three stages, creating a "building toward something" feeling.

## Design

### Stage 1: The Spark (3 participants — button first appears)

- Faint warm glow: `box-shadow: 0 0 8px rgba(142, 58, 59, 0.2)`
- No animation
- Background stays `#69292a` (current burgundy)
- Just enough to distinguish it from a plain button

### Stage 2: Building Energy (5+ participants)

- Brighter glow: `box-shadow: 0 0 20px rgba(142, 58, 59, 0.4)`
- Background lightens to `#7a3233`
- Gentle pulse animation — 2.5s ease-in-out infinite cycle
- Pulse oscillates box-shadow between 20px and 30px spread

### Stage 3: The Beacon (8+ participants)

- Strong glow with outer halo: `box-shadow: 0 0 30px rgba(168, 68, 69, 0.6), 0 0 60px rgba(168, 68, 69, 0.3)`
- Background shifts to gradient: `linear-gradient(135deg, #a84445, #8e3a3b)`
- Faster, more energetic pulse — 1.8s ease-in-out infinite cycle
- Pulse oscillates between 30px/60px and 40px/80px spread

### Transitions Between Stages

- CSS `transition` on `box-shadow` and `background` properties for smooth changes when crossing thresholds
- Stage downgrades (removing participants) transition smoothly too

### Accessibility

- `prefers-reduced-motion` is already handled in `tokens.css` — all animations get reduced to 0.01ms duration automatically
- Button remains fully functional at all stages; glow is purely decorative
- No color-only information — the glow reinforces but doesn't replace the hint text

## Implementation

### CSS (new classes in `buttons.css`)

Three classes applied to the `#generate` button:

- `.generate-glow-1` — stage 1 styles
- `.generate-glow-2` — stage 2 styles + pulse-soft animation
- `.generate-glow-3` — stage 3 styles + pulse-strong animation

Two `@keyframes` rules: `pulse-soft` (2.5s) and `pulse-strong` (1.8s).

Add `transition: box-shadow 0.4s, background 0.4s` to `.btn-bottom` or specifically to `#generate`.

### JS (GenerateButton.js)

`GenerateButton.js` already tracks `participantCount` via the `PARTICIPANT_ADDED` event and calls `render()`. The changes:

1. Add a `getGlowClass(count)` function that returns the appropriate class name based on count thresholds (3, 5, 8)
2. In `render()`, after inserting the template, apply the glow class to the button
3. Add a new `PARTICIPANT_REMOVED` subscription to update the glow class when names are removed (downgrade stages)
4. On `EXCHANGE_STARTED`, reset the glow state along with the existing `participantCount` reset

### Thresholds

| Participants | Stage | Glow Class |
|---|---|---|
| < 3 | Button not visible | (none) |
| 3-4 | Stage 1 — Spark | `.generate-glow-1` |
| 5-7 | Stage 2 — Building | `.generate-glow-2` |
| 8+ | Stage 3 — Beacon | `.generate-glow-3` |

### Files Changed

- `public/css/components/buttons.css` — Add glow classes and keyframe animations
- `src/exchange/components/ControlStrip/GenerateButton.js` — Add glow class logic based on participant count

### What Stays the Same

- Button size (150px width, same padding/margin)
- Hint text behavior (`#generate-hint` content unchanged)
- Button disappears after Secret Santa generation
- Ctrl+Enter keybinding
- Control strip positioning and frosted glass effect
- `btn-bottom` base styles

## Testing

- Unit tests for `getGlowClass()` function: returns correct class for each threshold
- Integration tests: verify correct CSS class is applied to `#generate` button after adding N participants
- Verify glow class updates on participant removal (stage downgrade)
- Verify glow resets on `EXCHANGE_STARTED`
