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

```js
// State shape (private, accessed via getState() in tests only):
{
  exchangeId: 'uuid',    // generated on startExchange()
  houses: [],            // array of {id, name, members[]}
  step: 1,               // current wizard step
  isSecretSanta: false,  // secret santa mode toggle
  participants: [],      // array of Participant {name, email}
  assignments: [],       // array of {giver, recipient}
  nameNumber: 1,         // counter for unique field IDs
  _tokenMap: undefined,  // set after email submission API response
}
```
- `isGenerated()` is a derived function (checks `assignments.length > 0`), not a stored field
- `Participant` class is private to exchangeState.js

### Container Component Pattern
Container components (like `house.js` and `nameList.js`) follow a consistent structure:
- **`template()`** — Returns the full HTML string including the outermost container div (e.g., `<div id="name-list">...</div>`), not just inner contents
- **`init()`** — Subscribes to state events via `stateEvents.on()` and calls `attachListeners()` for static DOM elements
- **`attachListeners()`** — Wires up event listeners on elements within the template
- **`onComponentAdded(event)`** — Filters by `event.type`, inserts template into `#left-container` (via `unshiftHTML` or `insertAdjacentHTML`), then calls `attachListeners()` for dynamically rendered elements
- **Empty lifecycle stubs** — `onComponentRemoved`, `onComponentUpdated` can be empty if the component doesn't react to those events
- Child components (e.g., `name.js`, `select.js`) fill slots inside the container via the `data-slot` pattern

### Frontend Design Principles
- **State is private** — Components never import `state` directly. They get data from event payloads, accessor functions, or closures.
- **State functions encapsulate mutation + emission** — They handle mutation, cascading cleanup (e.g., `removeHouseFromState` removes all members first), and event emission with `{...state}` spread into payloads.
- **Event payloads carry state** — Every emit spreads `...state` plus any event-specific fields (e.g., `{houseID, ...state}`). Components destructure what they need.
- **Components subscribe to events they care about** — Each component is self-sufficient in knowing what events matter to them.
- **Click handlers use closures or cached values** — When a click handler needs state data, it either receives it through the render closure chain or caches it from event callbacks (e.g., `currentStep` in NextStepButton).
- **Generate module uses accessor functions** — `generate.js` calls `getParticipantNames()` and `getHousesForGeneration()` — never reads state directly.
- **No framework** — Pure vanilla JS with a lightweight pub/sub event system.

### Backend: Netlify Serverless Functions + MongoDB

#### Shared Modules (`netlify/shared/`)
- **middleware.mjs** — `apiHandler(method, fn)` wraps handlers with method check + try/catch; `validateBody(schema, event)` parses request body against Zod schema
- **responses.mjs** — HTTP response helpers: `ok()`, `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `serverError()`, `methodNotAllowed()`
- **auth.mjs** — `extractTokenFromPath(event, afterSegment)` extracts token from URL; `getUserByToken(token)` finds user and conforms via `userSchema.parse()`
- **giverNotification.mjs** — `forEachGiverOf(user, callback)` iterates exchanges to find givers of a recipient; `sendNotificationEmail(template, to, subject, params)` sends via Netlify email function
- **db.mjs** — MongoDB connection + collection getters (`getUsersCollection`, `getExchangesCollection`, `getLegacyCollection`)
- **schemas/user.mjs** — Zod 4 schemas: `userSchema`, `wishlistSchema`, `wishItemSchema`
- **schemas/exchange.mjs** — Zod 4 schemas: `exchangeSchema`, `assignmentSchema`, `houseSchema`

#### API Endpoints (`netlify/functions/`)
All `api-*` endpoints use `apiHandler` wrapper and Zod validation:
- **api-exchange-post.mjs** — Creates exchange with participants, assignments, houses. Upserts users by email. Has `.check()` refinement validating assignment names exist in participants.
- **api-exchange-get.mjs** — Returns recipient wishlist data for a giver viewing an exchange
- **api-exchange-search.mjs** — Finds all exchanges for a user by email
- **api-user-get.mjs** — Returns user data (name, wishlists, wishItems) by token
- **api-user-wishlist-put.mjs** — Updates user wishlists/wishItems; notifies givers on first submission
- **api-user-contact-post.mjs** — Emails contact info to givers (not stored in DB)
- **api-giver-notify-post.mjs** — Sends recipient assignment notification email to a giver
- **api-recipient-get.mjs** — Looks up recipient by giver email (new collections + legacy fallback)

Legacy endpoints (not refactored): `get_name.mjs`, `postToDb.mjs`

#### Zod 4 Schema Conventions
- Use Zod 4 standalone types: `z.email()`, `z.uuid()`, `z.url()` (NOT deprecated `z.string().email()`)
- Use `.check(ctx => { ctx.issues.push(...) })` for custom validation (NOT deprecated `.superRefine()`)
- Do NOT use `.passthrough()` (deprecated in Zod 4)
- DB document schemas (`userSchema`, `exchangeSchema`) are shared in `netlify/shared/schemas/`
- Request body schemas are colocated in the endpoint file that uses them
- Request schemas derive from DB schemas where possible (e.g., `userSchema.pick({wishlists: true, wishItems: true})`)
- All schema variable names end with `Schema` (e.g., `exchangePostRequestSchema`, `giverNotifyRequestSchema`)
- DB lookups that return user/exchange documents should conform via `.parse()` to apply defaults

### File Structure
```
src/
  EventEmitter.js        # Reusable EventEmitter class
  Snackbar.js            # Shared toast notification component
  utils.js               # DOM helpers (selectElement, click, addEventListener, pushHTML, unshiftHTML, escape, escapeAttr)
  viteMultiPagePlugin.js # Vite plugin for multi-page build
  reuse.js               # Reuse previous exchange page
  wishlistView.js        # Wishlist viewing page
  exchange/
    index.js             # Entry point, initializes all exchange components
    state.js             # Private state + mutation functions + event emission (state NOT exported)
    generate.js          # Name drawing algorithm (uses accessor functions, not state)
    dragDrop.js          # Drag and drop name reassignment
    components/
      ControlStrip/
        ControlStrip.js    # Container shell with slots + keybinding helpers
        NextStepButton.js  # Next Step button component
        AddHouseButton.js  # Add Group button component
        GenerateButton.js  # Generate List button component
      House.js           # House/group container component
      NameList.js        # Name list container component
      Name.js            # Participant name management
      Select.js          # Dropdown rendering
      ResultsTable.js    # Results display (event-driven)
      Instructions.js    # Intro instructions component
      EmailTable/
        EmailTable.js    # Email collection UI
        SendEmails.js    # Email dispatch logic
      EmailQuery.js      # Email lookup
  wishlistEdit/
    index.js             # Entry point, initializes wishlist edit components
    state.js             # Encapsulated state for wishlist edit page
    components/
      Greeting.js        # User greeting display
      WishlistList.js    # Wishlist URL management
      ItemList.js        # Individual item management
      SaveButton.js      # Save wishlist button + API call
      ContactForm.js     # Contact info form + API call

pages/
  reuse/index.html         # Reuse exchange page
  wishlist/edit/index.html # Wishlist editing page
  wishlist/view/index.html # Wishlist viewing page

netlify/
  shared/
    middleware.mjs     # apiHandler wrapper + validateBody
    responses.mjs      # HTTP response helpers (ok, badRequest, etc.)
    auth.mjs           # Token extraction + user lookup with schema conforming
    giverNotification.mjs # Giver notification loop + email sending
    db.mjs             # MongoDB connection + collection getters
    schemas/
      user.mjs         # User, wishlist, wishItem Zod schemas
      exchange.mjs     # Exchange, assignment, house Zod schemas
  functions/
    api-exchange-post.mjs    # Create exchange
    api-exchange-get.mjs     # View recipient wishlist
    api-exchange-search.mjs  # Search exchanges by email
    api-user-get.mjs         # Get user by token
    api-user-wishlist-put.mjs # Update wishlists
    api-user-contact-post.mjs # Send contact info to givers
    api-giver-notify-post.mjs # Notify giver of recipient
    api-recipient-get.mjs    # Lookup recipient by giver email
    get_name.mjs             # Legacy: get recipient name
    postToDb.mjs             # Legacy: store exchange data

spec/
  specHelper.js          # Test utilities (initReactiveSystem, resetState, enterName, click, etc.)
  setupTests.js          # JSDOM initialization from index.html
  testData.js
  utils.spec.js
  viteMultiPagePlugin.spec.js
  Snackbar.spec.js
  wishlistView.spec.js
  reuse.spec.js
  exchange/
    state.spec.js
    generate.spec.js
    dragDrop.spec.js
    index.spec.js
    layout.spec.js
    components/
      ControlStrip/
        ControlStrip.spec.js
        NextStepButton.spec.js
        AddHouseButton.spec.js
        GenerateButton.spec.js
      EmailQuery.spec.js
      EmailTable/
        EmailTable.spec.js
        SendEmails.spec.js
      ResultsTable.spec.js
      House.spec.js
      NameList.spec.js
      Name.spec.js
      Instructions.spec.js
  wishlistEdit/
    index.spec.js
    state.spec.js
  netlify-functions/
    api-exchange-post.spec.js
    api-exchange-get.spec.js
    api-exchange-search.spec.js
    api-user-get.spec.js
    api-user-wishlist-put.spec.js
    api-user-contact-post.spec.js
    api-giver-notify-post.spec.js
    api-recipient-get.spec.js
    db.spec.js
    get_name.spec.js
    postToDb.spec.js
    schemas/
      user.spec.js
  scripts/
    migrate-legacy.spec.js
```

## Testing

### Test Runner
- **Vitest** with jsdom environment
- Config: `vitest.config.ts`
- Run: `npx vitest --watch` (autorunner)
- Setup: `setupTests.js` loads `index.html` into jsdom

### Frontend Test Helpers (specHelper.js)
Key functions to reuse:
- `initReactiveSystem()` — Initializes house, name, select components + render subscriptions (call in `beforeAll`)
- `resetState()` — Resets all state to defaults (call in `beforeEach`)
- `enterName(name)` — Sets input value and clicks Add (emits PARTICIPANT_ADDED, updates caches)
- `addHouseToDOM()` — Calls `addHouseToState()` (no args — ID generated internally)
- `moveNameToHouse(selector, name)` — Changes select to move name
- `click(selector)` / `change(selector, value)` — Simulate events
- `shouldSelect(selector)` / `shouldNotSelect(selector)` — Assert element exists/doesn't
- `shouldDisplayErrorSnackbar(message)` — Assert error snackbar shown
- `installGiverNames(...names)` / `installParticipantNames(...names)` — Push to `getState().participants` (does NOT emit events — use `addParticipant()` when event-driven components need to react)
- `removeAllNames()` / `removeAllHouses()` — DOM cleanup
- Tests access state via `getState()` from exchangeState.js — `state` is not exported

### Backend Test Patterns (tests/netlify-functions/)
- Use `MongoMemoryServer` for in-memory MongoDB during tests
- Set env vars (`MONGO_DB_URI`, `MONGODB_DATABASE`, etc.) in `beforeAll`
- Dynamic `import()` of handler module in `beforeAll` (after env setup)
- `buildEvent(body)` helper constructs Netlify event objects
- `afterEach` cleans collections; `afterAll` stops mongo + restores env
- Use `vi.stubGlobal('fetch', mockFetch)` for email-sending endpoints
- Test fixtures must use valid UUIDs for token fields (schema enforced)
- Test fixtures must use valid URLs for wishlist/wishItem url fields
- Test fixtures must use valid emails for email fields

## User Preferences

### Code Style
- State-centric API naming — Functions should describe what state they change (e.g., `setIsGenerated(bool)`), not reference internal implementation (avoid names like `emitResultsUpdate`)
- Components should be self-sufficient — Subscribe to the events they care about rather than being told to update by other components
- Separation of concerns — Business logic (generate) should not know about UI components. It should only update state.
- Prefer reuse over duplication — Use existing utils.js and specHelper.js functions

### TDD Workflow
- Write one test at a time
- Check test output between phases
- Start vitest autorunner in background before TDD work
- Only one test process at a time (kill existing before starting new)