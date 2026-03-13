# Gift Exchange Generator

[//]: # ([![Netlify Status]&#40;https://api.netlify.com/api/v1/badges/43d35f0f-ec57-49ec-aa21-12994b32c618/deploy-status&#41;]&#40;https://app.netlify.com/projects/giftexchangegenerator/deploys&#41;)
[![Test and Deploy](https://github.com/arootroatch/ChristmasGiftExchange/actions/workflows/vitest.yml/badge.svg)](https://github.com/arootroatch/ChristmasGiftExchange/actions/workflows/vitest.yml)
[![codecov](https://codecov.io/gh/arootroatch/ChristmasGiftExchange/branch/main/graph/badge.svg)](https://codecov.io/gh/arootroatch/ChristmasGiftExchange)

A gift exchange name-drawing app built with vanilla JavaScript — no React, no framework. Instead, I built my own reactive component system from scratch using a central state store and an event-driven architecture inspired by unidirectional data flow.

**Try it live:** https://giftexchangegenerator.netlify.app/

![Gift Exchange Generator Demo](/assets/Demo.gif)

## Why Build This?

Drawing names from a hat doesn't work when your family is scattered across the country. And having one person draw on everyone's behalf ruins the surprise. This app lets participants be grouped so housemates can't draw each other, and Secret Santa Mode keeps every assignment private — each person gets an email with only their recipient.

![Secret Santa Mode](/assets/SecretSantaMode.png)
![Recipient Lookup](/assets/SearchEmail.gif)

## Features

### Name Drawing
- Add participants and optionally group them into households
- Groups prevent members from drawing each other
- Secret Santa Mode emails each participant their assignment privately
- Drag-and-drop reassignment of generated results

### Wishlists
- Each participant receives a unique link to submit their wishlist
- Wishlist links, individual item links, and contact/shipping info
- Givers can view their recipient's wishlist through the exchange email

### Reuse Past Exchanges
- Look up previous exchanges by email
- Reuse participant lists, groups, and emails without re-entering everything

## Architecture

### State as Single Source of Truth

Like React, the UI is a function of state. A central state module owns all application data and exposes named mutation functions. Every mutation emits a corresponding event — components never modify state directly and never talk to each other.

```
User Action -> State Mutation -> Event Emitted -> Components React
```

The state module exposes functions like `addParticipant()`, `removeHouseFromState()`, and `assignRecipients()`. Each one updates the state object and emits a specific event. The emit functions are private — external code can only trigger changes through the named API.

### Lightweight Pub/Sub Event System

A custom `EventEmitter` class (20 lines) provides the reactive glue. A singleton `stateEvents` instance acts as the event bus. Components subscribe during `init()` and respond only to the events they care about:

```js
// resultsTable.js — subscribes to exactly the events it needs
export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => { /* render or remove */ });
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({ givers }) => { /* populate table */ });
}
```

This keeps components self-sufficient. Adding a new component means subscribing to existing events — no wiring changes needed elsewhere.

### Multi-Page App

The app is organized as multiple pages sharing common modules:
- **Exchange page** (`src/exchange/`) — the main name-drawing wizard
- **Wishlist edit page** (`src/wishlistEdit/`) — participant wishlist submission
- **Wishlist view page** (`src/wishlistView.js`) — giver views recipient's wishlist
- **Reuse page** (`src/reuse.js`) — search and reuse past exchanges

A custom Vite plugin (`viteMultiPagePlugin.js`) handles the multi-page build with HTML entry points in the `pages/` directory.

### Bipartite Matching Algorithm

The name-drawing algorithm isn't just random shuffling. It models the problem as a bipartite graph where each participant can be assigned to any recipient outside their exclusion group. It then finds a [perfect matching](https://en.wikipedia.org/wiki/Matching_(graph_theory)#In_unweighted_bipartite_graphs) using augmenting paths, guaranteeing a valid assignment exists before presenting results — or reporting that the constraints make one impossible.

The algorithm is pure business logic with no UI imports, following strict separation of concerns.

### Serverless Backend

Netlify Functions handle the server-side work:
- **MongoDB Atlas** — stores exchanges, user wishlists, and assignments
- **Postmark** — sends each participant an email with their assigned recipient
- **Zod 4** — validates all request bodies and database documents

## Testing

The project has three test layers:

- **Unit tests** — Vitest + jsdom. Components tested in isolation by emitting events and asserting on DOM output.
- **Integration tests** — Contract tests that call real backend handlers with frontend-shaped payloads against MongoMemoryServer, verifying request/response shapes stay in sync.
- **E2E tests** — Playwright driving a real `netlify dev` server backed by MongoMemoryServer, verifying critical user journeys end-to-end.

## Error Handling

A custom snackbar notification system handles user-facing errors:
- Missing participants before generation
- Duplicate name detection
- Impossible constraint configurations (e.g., a group larger than half the participants)

![Error Message](/assets/ErrorMessage.png)

## Contributing

### Clone the repo

```bash
git clone https://github.com/arootroatch/ChristmasGiftExchange.git
cd ChristmasGiftExchange
npm install
```

### Run tests

```bash
npm test              # all unit + integration tests (watch mode)
npm run unit          # unit tests only (watch mode)
npm run integration   # integration/contract tests only (watch mode)
npm run e2e           # Playwright end-to-end tests
npm run coverage      # all tests with coverage report
```

Add `-- run` to any vitest command for a single run instead of watch mode:

```bash
npm test -- run
npm run unit -- run
```

### Local development

Local development requires the Netlify CLI and a MongoDB instance.

1. **Install the Netlify CLI** (if you haven't already):

   ```bash
   npm i -g netlify-cli
   ```

2. **Start the dev database** in a separate terminal. This launches an in-memory MongoDB via MongoMemoryServer, seeds it with test data, and opens a REPL for querying:

   ```bash
   bin/db
   ```

   The script updates `MONGO_DB_URI` in `.env.local` to point to the in-memory server.

   You can also connect a REPL to an existing database (dev or production):

   ```bash
   npm run repl        # prompts for environment (dev or prod)
   npm run repl dev    # connects using .env.local
   npm run repl prod   # connects using .env
   ```

3. **Start the dev server** in another terminal:

   ```bash
   npm run dev
   ```

   This runs `netlify dev`, which starts the Vite dev server and proxies serverless function requests. Environment variables are loaded from `.env.local`.

4. **Preview email templates** (optional):

   ```bash
   netlify build
   npm run dev
   ```

   Then visit `localhost:8888/.netlify/functions/emails` to see rendered email previews.

### CI/CD Pipeline

Pushes to `main` trigger a GitHub Actions workflow:

1. **Unit + integration tests** — Vitest with coverage uploaded to Codecov
2. **E2E tests** — Playwright against a `netlify dev` server backed by MongoMemoryServer
3. **Staging deploy** — Netlify draft deploy (requires both test jobs to pass)
4. **Production deploy** — Manual approval gate via GitHub environment protection rules

Non-production deploys use a separate staging database so preview and branch deploy activity doesn't affect production data.

### Submit a pull request

If you'd like to contribute, please fork the repository and open a pull request to the 'main' branch.
