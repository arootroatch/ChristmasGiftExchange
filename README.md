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

## Architecture

### State as Single Source of Truth

Like React, the UI is a function of state. A central `state.js` module owns all application data and exposes named mutation functions. Every mutation emits a corresponding event — components never modify state directly and never talk to each other.

```
User Action → State Mutation → Event Emitted → Components React
```

The state module exposes functions like `addGiver()`, `removeHouseFromState()`, and `assignRecipients()`. Each one updates the state object and emits a specific event. The emit functions are private — external code can only trigger changes through the named API.

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

### Bipartite Matching Algorithm

The name-drawing algorithm isn't just random shuffling. It models the problem as a bipartite graph where each participant can be assigned to any recipient outside their exclusion group. It then finds a [perfect matching](https://en.wikipedia.org/wiki/Matching_(graph_theory)#In_unweighted_bipartite_graphs) using augmenting paths, guaranteeing a valid assignment exists before presenting results — or reporting that the constraints make one impossible.

The algorithm is pure business logic with no UI imports, following strict separation of concerns.

### Serverless Backend

Netlify Functions handle the server-side work:
- **MongoDB Atlas** — stores assignments so participants can look up their recipient by email
- **Postmark** — sends each participant an email with their assigned recipient

## Testing

The project uses **Vitest** with **jsdom** for a full unit test suite. The event-driven architecture makes components naturally testable in isolation — each component can be tested by emitting events and asserting on DOM output, without needing to set up the entire application.

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
```

### Netlify CLI

The Netlify Serverless functions for MongoDB and Postmark email will not work without a Netlify CLI local development server and authentication to both my Netlify account and MongoDB Atlas cluster.

To install:
`npm i -g netlify-cli`

Then:
`netlify dev`

### Submit a pull request

If you'd like to contribute, please fork the repository and open a pull request to the 'main' branch.