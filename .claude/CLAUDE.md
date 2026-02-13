# Christmas Gift Exchange - Project Guide

## Project Overview
A vanilla JavaScript web app for drawing names in a gift exchange or Secret Santa. Built with Vite, tested with Vitest + jsdom, deployed on Netlify.

## Architecture

### Event-Driven Component System
- **state.js** — Central state object + mutation functions that emit events
- **events.js** — `EventEmitter` class with `stateEvents` singleton and `Events` enum (`COMPONENT_ADDED`, `COMPONENT_REMOVED`, `COMPONENT_UPDATED`)
- **render.js** — `registerComponent(type, handlers)` + `initRenderSubscriptions()` that routes events to all registered component lifecycle methods (`onComponentAdded`, `onComponentUpdated`, `onComponentRemoved`)
- **Components** register via `init()` → `registerComponent()` and respond to events by checking `event.type`

### State Object
```js
{
  houses: {},           // houseID -> array of names
  introIndex: 0,        // current intro step
  isSecretSanta: false, // secret santa mode toggle
  givers: [],           // array of Giver objects
  nameNumber: 1         // counter for unique field IDs
}
```
- `isGenerated()` is a derived function (checks if all givers have recipients), not a stored field

### Container Component Pattern
Container components (like `house.js` and `nameList.js`) follow a consistent structure:
- **`template()`** — Returns the full HTML string including the outermost container div (e.g., `<div id="name-list">...</div>`), not just inner contents
- **`init()`** — Registers the component via `registerComponent()` and calls `attachListeners()` for static DOM elements
- **`attachListeners()`** — Wires up event listeners on elements within the template
- **`onComponentAdded(event)`** — Filters by `event.type`, inserts template into `#left-container` (via `unshiftHTML` or `insertAdjacentHTML`), then calls `attachListeners()` for dynamically rendered elements
- **Empty lifecycle stubs** — `onComponentRemoved`, `onComponentUpdated` can be empty if the component doesn't react to those events
- Child components (e.g., `name.js`, `select.js`) fill slots inside the container via the `data-slot` pattern

### Key Design Principles
- **State functions are pure state mutators** — They handle mutation, cascading cleanup (e.g., `removeGiver` removes from houses too), and event emission. Input validation and formatting (e.g., capitalization, empty checks) belong in the UI handler, not in state functions.
- **Event handlers call state functions directly** — No intermediate wrapper functions like `addName` or `deleteName` that just delegate to state functions. Inline arrows are fine for short handlers; multi-line handlers can be extracted into named functions.
- **Emit functions are private** — `emitAddComponent`, `emitUpdateComponent`, `emitRemoveComponent` are internal to state.js. External code calls named state functions (e.g., `addGiver`, `removeGiver`).
- **Components subscribe to events they care about** — Each component checks `event.type` in its lifecycle methods and responds accordingly. Components are self-sufficient in knowing what events matter to them.
- **Generate module only updates state** — `generate.js` does not directly call rendering functions. It updates state and lets components respond via the event system.
- **No framework** — Pure vanilla JS with a lightweight pub/sub event system.

### File Structure
```
resources/js/
  main.js              # Entry point, initializes all components
  state.js             # State management + event emission
  events.js            # EventEmitter class
  render.js            # Component registry + event routing
  generate.js          # Name drawing algorithm
  utils.js             # DOM helpers (selectElement, click, addEventListener, pushHTML, unshiftHTML, etc.)
  layout.js            # Step navigation, intro flow
  dragDrop.js          # Drag and drop name reassignment
  components/
    controlStrip/
      controlStrip.js    # Container shell with slots + keybinding helpers
      nextStepButton.js  # Next Step button component
      addHouseButton.js  # Add Group button component
      generateButton.js  # Generate List button component
    house.js           # House/group container component
    nameList.js        # Name list container component
    name.js            # Participant name management
    select.js          # Dropdown rendering
    resultsTable.js    # Results display (event-driven)
    emailTable.js      # Email collection UI
    emailQuery.js      # Email lookup
    snackbar.js        # Toast notifications

tests/
  specHelper.js        # Test utilities (initReactiveSystem, resetState, enterName, click, etc.)
  setupTests.js        # JSDOM initialization from index.html
  testData.js
  state.spec.js
  generate.spec.js
  layout.spec.js
  dragDrop.spec.js
  main.spec.js
  components/
    controlStrip/
      controlStrip.spec.js
      nextStepButton.spec.js
      addHouseButton.spec.js
      generateButton.spec.js
    resultsTable.spec.js
    house.spec.js
    nameList.spec.js
    name.spec.js
    emailTable.spec.js
    snackbar.spec.js
```

## Testing

### Test Runner
- **Vitest** with jsdom environment
- Config: `vitest.config.ts`
- Run: `npx vitest --watch` (autorunner)
- Setup: `setupTests.js` loads `index.html` into jsdom

### Test Helpers (specHelper.js)
Key functions to reuse:
- `initReactiveSystem()` — Initializes house, name, select components + render subscriptions (call in `beforeAll`)
- `resetState()` — Resets all state to defaults (call in `beforeEach`)
- `enterName(name)` — Sets input value and clicks Add
- `addHouseToDOM()` — Calls addHouseToState directly
- `moveNameToHouse(selector, name)` — Changes select to move name
- `click(selector)` / `change(selector, value)` — Simulate events
- `shouldSelect(selector)` / `shouldNotSelect(selector)` — Assert element exists/doesn't
- `shouldDisplayErrorSnackbar(message)` — Assert error snackbar shown
- `installGiverNames(...names)` — Directly push givers to state
- `removeAllNames()` / `removeAllHouses()` — DOM cleanup

### Pre-existing Test Failures
4 tests in `generate.spec.js` and 2 in `snackbar.spec.js` fail due to CSS color format differences (`#b31e20` vs `rgb(179, 30, 32)`). These are unrelated to feature work.

## User Preferences

### Code Style
- State-centric API naming — Functions should describe what state they change (e.g., `setIsGenerated(bool)`), not reference internal implementation (avoid names like `emitResultsUpdate`)
- Components should be self-sufficient — Subscribe to the events they care about rather than being told to update by other components
- Separation of concerns — Business logic (generate) should not know about UI components. It should only update state.
- Prefer reuse over duplication — Use existing utils.js and specHelper.js functions

### TDD Workflow
- Use the TDD agents (tdd-referee, tdd-red, tdd-green, refactor) for Red-Green-Refactor cycle
- Write one test at a time
- Check test output between phases
- Start vitest autorunner in background before TDD work
- Only one test process at a time (kill existing before starting new)