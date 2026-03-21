---
name: frontend-testing
description: Frontend test helpers and patterns — specHelper.js API, initReactiveSystem, resetState, DOM helpers, snackbar initialization, jsdom navigation proxy
---

# Frontend Testing Patterns

## Test Runner

- **Vitest** with jsdom environment
- Config: `vitest.config.ts`
- Run: `npx vitest --watch` (autorunner)
- Setup: `setupTests.js` loads `index.html` into jsdom

## specHelper.js API

### Setup Functions
- **`initReactiveSystem()`** — Initializes house, name, select components + render subscriptions. Call in `beforeAll`. Also calls `snackbar.init()`.
- **`resetState()`** — Resets all state to defaults. Call in `beforeEach`.

### DOM Interaction
- **`enterName(name)`** — Sets input value and clicks Add (emits PARTICIPANT_ADDED, updates caches)
- **`addHouseToDOM()`** — Calls `addHouseToState()` (no args — ID generated internally)
- **`moveNameToHouse(selector, name)`** — Changes select to move name
- **`click(selector)`** / **`change(selector, value)`** — Simulate events

### Assertions
- **`shouldSelect(selector)`** / **`shouldNotSelect(selector)`** — Assert element exists/doesn't
- **`shouldDisplayErrorSnackbar(message)`** — Assert error snackbar shown

### State Helpers
- **`installGiverNames(...names)`** / **`installParticipantNames(...names)`** — Push to `getState().participants` but do NOT emit events. Use `addParticipant()` when event-driven components need to react.
- **`removeAllNames()`** / **`removeAllHouses()`** — DOM cleanup

### State Access
- Tests access state via **`getState()`** from exchangeState.js — `state` is not exported

## Snackbar Initialization

- `initReactiveSystem()` calls `snackbar.init()` — tests using it don't need separate init
- `resetDOM()` in specHelper calls `snackbar.init()` to refresh stale DOM references
- Tests NOT using `initReactiveSystem()` that need snackbar must call `initSnackbar()` in `beforeAll`

## jsdom Navigation Proxy Pattern

For multi-page modules (wishlistView, wishlistEdit, reuse) that create their own JSDOM instances:

jsdom doesn't implement `window.location.href = ...` navigation. Fix: wrap `dom.window` in a `Proxy` that intercepts `location` access:

```js
const locationMock = { pathname: '/', search: '', href: '' };
const window = new Proxy(dom.window, {
  get(target, prop) {
    if (prop === 'location') return locationMock;
    return Reflect.get(target, prop);
  }
});
```

- `Object.defineProperty` on the proxy forwards to `dom.window` (default trap behavior)
- `mockSessionStorage` and `mockFetch` work through the proxy without changes

## ESM Spy Timing

`vi.spyOn` must be set **before** `addEventListener` captures the function reference. If spying on a module method used as an event handler, set up the spy before the component's `init()` runs.
