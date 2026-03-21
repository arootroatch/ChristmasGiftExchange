# Christmas Gift Exchange - Project Guide

## Project Overview
A vanilla JavaScript web app for drawing names in a gift exchange or Secret Santa. Built with Vite, tested with Vitest + jsdom, deployed on Netlify with serverless functions backed by MongoDB.

## Architecture

### Frontend: Event-Driven Component System
- **EventEmitter.js** — Reusable `EventEmitter` class (no page-specific code)
- **exchange/state.js** — Private state object + mutation functions that emit events via `exchangeEvents` singleton. Components never import state directly.
- **wishlistEdit/state.js** — Encapsulated state for wishlist edit page with getter functions
- **Snackbar.js** — Shared toast notification component (used by all pages)
- **Components** subscribe via `init()` → `stateEvents.on()` and destructure what they need from event payloads
- **Multi-page app** — `pages/` directory has HTML entry points; `viteMultiPagePlugin.js` handles the build

### Exchange State Architecture
The exchange state object is **private** (not exported). Components access data through:
1. **Event payloads** — Every `emit()` spreads `...state` into the payload, so callbacks destructure what they need
2. **Closure chains** — Event callback → render() → click handler, passing data through closures
3. **State accessor functions** — `getExchangePayload()`, `getParticipantNames()`, `nextNameNumber()`, `isGenerated()`, `getState()` (tests only)
4. **Cached module variables** — For click handlers that need current state (e.g., NextStepButton caches `currentStep`/`currentParticipantsLength`)

### Container Component Pattern
Container components (like `house.js` and `nameList.js`) follow a consistent structure:
- **`template()`** — Returns the full HTML string including the outermost container div
- **`init()`** — Subscribes to state events via `stateEvents.on()` and calls `attachListeners()`
- **`attachListeners()`** — Wires up event listeners on elements within the template
- **`onComponentAdded(event)`** — Filters by `event.type`, inserts template, then calls `attachListeners()`
- Child components fill slots inside the container via the `data-slot` pattern

### Frontend Design Principles
- **State is private** — Components get data from event payloads, accessor functions, or closures
- **State functions encapsulate mutation + emission** — Handle mutation, cascading cleanup, and event emission with `{...state}` spread
- **Event payloads carry state** — Every emit spreads `...state` plus event-specific fields
- **Components subscribe to events they care about** — Self-sufficient, not told to update by others
- **Click handlers use closures or cached values** — Via render closure chain or cached module variables
- **Generate module uses accessor functions** — Never reads state directly
- **No framework** — Pure vanilla JS with lightweight pub/sub event system

## Skills

Detailed guides are split into on-demand skills:
- **`project-map`** — Full file structure tree
- **`backend-conventions`** — Netlify serverless architecture, shared modules, Zod 4 schema conventions
- **`backend-testing`** — MongoMemoryServer setup, buildEvent helper, fixture requirements
- **`frontend-testing`** — specHelper.js API, DOM helpers, snackbar init, jsdom proxy pattern

## User Preferences

### Code Style
- State-centric API naming — Functions describe what state they change (e.g., `setIsGenerated(bool)`)
- Components should be self-sufficient — Subscribe to events rather than being told to update
- Separation of concerns — Business logic should not know about UI components
- Prefer reuse over duplication — Use existing utils.js and specHelper.js functions

### TDD Workflow
- Write one test at a time
- Check test output between phases
- Start vitest autorunner (`npx vitest --watch`) in background before TDD work
- Only one test process at a time (kill existing before starting new)
