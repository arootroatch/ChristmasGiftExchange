# Test Infrastructure Unification

## Problem

Test data creation and database management are fragmented across multiple files with duplicated logic:

- `spec/shared/testFactories.js` has factory functions used by ~22 test files, but most tests create similar user/exchange objects over and over instead of sharing pre-built data
- `spec/testData.js` has only simple name/email stubs (4 fields total), used by 4 frontend files
- `spec/integration/contractHelper.js` is a thin re-export layer of factories + mongo helpers with duplicate `seedUsers()`/`seedExchange()`
- `e2e/helpers.js` has its own `seedUsers()`/`seedExchange()`/`findUser()`/`findExchange()` plus its own DB connection management
- `e2e/globalSetup.js` creates its own MongoMemoryServer independently from `spec/netlify-functions/mongoSetup.js`
- `spec/netlify-functions/mongoHelper.js` and `spec/netlify-functions/mongoSetup.js` are two separate files for closely related MongoDB lifecycle concerns

## Design

### `spec/testData.js` — Single source of truth for test data

Three sections in this order, organized with IntelliJ region comments:

**1. Factory functions** — `makeUser()` and `makeExchange()` for edge cases that need one-off custom documents not worth adding to shared data. Defined first because shared data uses them:

```javascript
;region Factories

export function makeUser({name, email, wishlists, wishItems, currency, _id} = {}) {
    return {
        _id: _id ?? new ObjectId(),
        name: name ?? 'Test User',
        email: email ?? 'test@test.com',
        wishlists: wishlists ?? [],
        wishItems: wishItems ?? [],
        ...(currency !== undefined && {currency}),
    };
}

export function makeExchange({exchangeId, organizer, participants, assignments, houses, isSecretSanta, createdAt} = {}) {
    return {
        exchangeId: exchangeId ?? crypto.randomUUID(),
        organizer: organizer ?? new ObjectId(),
        createdAt: createdAt ?? new Date(),
        isSecretSanta: isSecretSanta ?? false,
        participants: participants ?? [],
        assignments: assignments ?? [],
        houses: houses ?? [],
    };
}

;endregion
```

**2. Shared test data documents** — Full MongoDB documents with `_id`, all required fields, ready for direct DB insertion. Built using the factories above. These cover the common cases so most tests just import what they need:

```javascript
;region Shared Test Data

export const alex = makeUser({name: 'Alex', email: 'alex@gmail.com'});
export const whitney = makeUser({name: 'Whitney', email: 'whitney@gmail.com'});
export const hunter = makeUser({name: 'Hunter', email: 'hunter@gmail.com'});
export const megan = makeUser({name: 'Megan', email: 'megan@gmail.com'});

// Pre-built exchanges for common scenarios
export const basicExchange = makeExchange({
    organizer: alex._id,
    participants: [
        {name: alex.name, email: alex.email},
        {name: whitney.name, email: whitney.email},
    ],
});
// ... additional shared exchanges as needed

;endregion
```

**3. Seeding helpers** — Database operations for inserting/querying test data. Accept `db` as a parameter so they work in both backend tests (per-test DB from `setupMongo()`) and E2E tests (shared DB from `connectDB()`):

```javascript
;region Seeding Helpers

export function seedUsers(db, ...users) {
    return db.collection('users').insertMany(users);
}

export function seedExchange(db, exchange) {
    return db.collection('exchanges').insertOne(exchange);
}

export function findUser(db, query) {
    return db.collection('users').findOne(query);
}

export function findExchange(db, query) {
    return db.collection('exchanges').findOne(query);
}

;endregion
```

Note: E2E's current `findUser()`/`findExchange()` use a module-level `db` reference (no param). The unified versions take `db` explicitly for consistency. E2E helpers will pass their module-level `db` when calling these.

### `spec/specHelper.js` — Gets `buildEvent()`

`buildEvent()` moves here since it's a test utility (mock request builder), not test data:

```javascript
export function buildEvent(httpMethod, {body, path, queryStringParameters, headers} = {}) {
    return {
        httpMethod,
        body: body ? JSON.stringify(body) : undefined,
        path: path ?? '/',
        queryStringParameters: queryStringParameters ?? {},
        headers: headers ?? {},
    };
}
```

### `spec/shared/mongoSetup.js` — Unified MongoDB lifecycle

Merges `spec/netlify-functions/mongoSetup.js` and `spec/netlify-functions/mongoHelper.js` into one file:

```javascript
;region MongoMemoryServer Lifecycle

// Called by vitest globalSetup and e2e globalSetup
let server;

export async function setup() {
    server = await MongoMemoryServer.create();
    process.env.MONGO_DB_URI = server.getUri();
}

export async function teardown() {
    await server.stop();
}

;endregion

;region Per-Test Isolation

// Called by individual backend test suites
export async function setupMongo() {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const dbName = `test-db-${crypto.randomUUID().slice(0, 8)}`;
    process.env.MONGODB_DATABASE = dbName;

    const client = new MongoClient(process.env.MONGO_DB_URI);
    await client.connect();
    const db = client.db(dbName);
    _setTestDb(db);

    return {client, db, consoleLogSpy, consoleErrorSpy};
}

export async function teardownMongo({client, consoleLogSpy, consoleErrorSpy}) {
    _setTestDb(null);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    await client.close();
}

export async function cleanCollections(db, ...names) {
    for (const name of names) {
        await db.collection(name).deleteMany({});
    }
}

;endregion
```

### `e2e/globalSetup.js` — Uses shared `setup()`

Replaces its own `MongoMemoryServer.create()` with:

```javascript
import {setup as startMongo, teardown as stopMongo} from '../spec/shared/mongoSetup.js';

export default async function globalSetup() {
    cleanupStaleRun();
    await startMongo();
    // ... rest of setup using process.env.MONGO_DB_URI ...

    return async () => {
        netlifyDev.kill('SIGTERM');
        await stopMongo();
        try { unlinkSync(STATE_FILE); } catch {}
    };
}
```

### `e2e/helpers.js` — Slimmed down

Removes duplicated data/seeding logic:

- **Removed**: `makeUser`/`makeExchange` re-exports, `seedUsers()`, `seedExchange()`, `findUser()`, `findExchange()` — all imported from `spec/testData.js` instead
- **Kept**: `connectDB()`, `disconnectDB()`, `cleanDB()` (E2E-specific DB connection via `.e2e-state.json`), `authenticateUser()`, `authenticateViaUI()` (E2E-specific auth helpers)

E2E test files import data/factories from `spec/testData.js` and E2E-specific helpers from `e2e/helpers.js`.

### `vitest.config.ts` — Updated globalSetup path

```javascript
globalSetup: ['spec/shared/mongoSetup.js'],
```

### Files deleted

- `spec/shared/testFactories.js` — merged into `testData.js`
- `spec/integration/contractHelper.js` — no longer needed
- `spec/netlify-functions/mongoHelper.js` — merged into `spec/shared/mongoSetup.js`
- `spec/netlify-functions/mongoSetup.js` — moved to `spec/shared/mongoSetup.js`

## Migration impact

All ~22 backend/integration test files currently importing from `testFactories.js` or `contractHelper.js` need import updates. Most can also be simplified by replacing inline `makeUser({name: 'Alex', email: 'alex@gmail.com'})` calls with the shared `alex` document.

E2E test files (5) need import updates to pull data from `testData.js` instead of `e2e/helpers.js`.

Frontend test files (4) already import from `testData.js` and will get richer objects (full documents instead of name/email stubs). These tests may need minor adjustments if they destructure or compare against the old simple shape.

## Testing strategy

After each file migration, run the relevant test suite to verify nothing breaks:
- `npx vitest run --project backend` for backend tests
- `npx vitest run --project frontend` for frontend tests
- `npx playwright test` for e2e tests
