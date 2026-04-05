# Test Infrastructure Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify test data, factories, seeding helpers, and MongoDB lifecycle into fewer, well-defined files — eliminating duplication across backend, integration, and E2E test infrastructure.

**Architecture:** `spec/testData.js` becomes the single source for shared test data documents, factory functions, and seeding helpers. `spec/shared/mongoSetup.js` merges the MongoMemoryServer lifecycle and per-test isolation into one file. `buildEvent()` moves to `spec/specHelper.js`. `testFactories.js`, `contractHelper.js`, and `mongoHelper.js` are deleted.

**Tech Stack:** Vitest, Playwright, MongoDB (MongoMemoryServer), Node.js

---

### Task 1: Create `spec/shared/mongoSetup.js` (merge mongoSetup + mongoHelper)

**Files:**
- Create: `spec/shared/mongoSetup.js`

This file merges `spec/netlify-functions/mongoSetup.js` (MongoMemoryServer lifecycle) and `spec/netlify-functions/mongoHelper.js` (per-test isolation) into one file.

- [ ] **Step 1: Create the merged file**

```javascript
import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import crypto from 'crypto';
import {vi} from 'vitest';
import {_setTestDb} from '../../netlify/shared/db.mjs';

;region MongoMemoryServer Lifecycle

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

- [ ] **Step 2: Update `vitest.config.ts` globalSetup path**

Change line 5 from:
```javascript
globalSetup: ['spec/netlify-functions/mongoSetup.js'],
```
to:
```javascript
globalSetup: ['spec/shared/mongoSetup.js'],
```

- [ ] **Step 3: Update all 20 backend test files importing from `mongoHelper.js`**

Every file under `spec/netlify-functions/` that imports from `./mongoHelper.js` needs the import path changed to `../shared/mongoSetup.js`. The import names stay the same (`setupMongo`, `teardownMongo`, `cleanCollections`).

Files in `spec/netlify-functions/` (17 files — change `'./mongoHelper.js'` to `'../shared/mongoSetup.js'`):
- `requireAuth.spec.js`
- `api-giver-retry-post.spec.js`
- `api-user-get.spec.js`
- `api-auth-code-post.spec.js`
- `authCodes.spec.js`
- `rateLimit.spec.js`
- `api-user-contact-post.spec.js`
- `api-recipient-get.spec.js`
- `api-auth-verify-post.spec.js`
- `api-results-email-post.spec.js`
- `api-auth-logout-post.spec.js`
- `giverNotification.spec.js`
- `api-exchange-post.spec.js`
- `api-user-wishlist-put.spec.js`
- `api-email-preview-get.spec.js`
- `api-my-exchanges-get.spec.js`
- `api-user-wishlist-get.spec.js`

Files in `spec/netlify-functions/emails/` (3 files — change `'../mongoHelper.js'` to `'../../shared/mongoSetup.js'`):
- `resultsSummary.spec.js`
- `secretSanta.spec.js`
- `wishlistNotification.spec.js`

Files in `spec/dev/` (3 files — change `'../netlify-functions/mongoHelper.js'` to `'../shared/mongoSetup.js'`):
- `run-migrations.spec.js`
- `migrate-prices.spec.js`
- `migrate-legacy.spec.js`

- [ ] **Step 4: Run backend tests to verify**

Run: `npx vitest run --project backend`
Expected: All tests pass.

- [ ] **Step 5: Delete old files**

Delete `spec/netlify-functions/mongoSetup.js` and `spec/netlify-functions/mongoHelper.js`.

- [ ] **Step 6: Run backend tests again after deletion**

Run: `npx vitest run --project backend`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add spec/shared/mongoSetup.js vitest.config.ts spec/netlify-functions/ spec/dev/
git commit -m "refactor: merge mongoSetup and mongoHelper into spec/shared/mongoSetup.js"
```

---

### Task 2: Move `buildEvent()` to `spec/specHelper.js`

**Files:**
- Modify: `spec/specHelper.js`

- [ ] **Step 1: Add `buildEvent()` to the end of `spec/specHelper.js`**

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

- [ ] **Step 2: Update imports in 12 backend test files**

These files import `buildEvent` from `'../shared/testFactories.js'`. Change to import from `'../specHelper.js'` (or `'../specHelper'`). Keep other imports from `testFactories.js` for now (they'll be migrated in Task 3).

Files in `spec/netlify-functions/` that import `buildEvent` from testFactories:
- `api-giver-retry-post.spec.js`
- `api-user-contact-post.spec.js`
- `api-recipient-get.spec.js`
- `api-user-wishlist-put.spec.js`
- `api-auth-code-post.spec.js`
- `api-results-email-post.spec.js`
- `api-user-get.spec.js`
- `api-user-wishlist-get.spec.js`
- `api-auth-verify-post.spec.js`
- `api-auth-logout-post.spec.js`
- `api-my-exchanges-get.spec.js`

For example, in `api-recipient-get.spec.js`, change:
```javascript
import {buildEvent, makeUser, makeExchange} from "../shared/testFactories.js";
```
to:
```javascript
import {makeUser, makeExchange} from "../shared/testFactories.js";
import {buildEvent} from "../specHelper.js";
```

For `api-auth-logout-post.spec.js` and `api-my-exchanges-get.spec.js` which only import `buildEvent`:
```javascript
// Before
import {buildEvent} from "../shared/testFactories.js";
// After
import {buildEvent} from "../specHelper.js";
```

- [ ] **Step 3: Update imports in 4 integration test files**

These files import `buildEvent` from `'./contractHelper.js'`. Change to import from `'../specHelper.js'`.

- `api-giver-retry-post.contract.spec.js` — also imports `makeUser, makeExchange, seedUsers, seedExchange` from contractHelper
- `api-exchange-post.contract.spec.js` — only imports `buildEvent` (plus mongo helpers) from contractHelper
- `api-user-wishlist-put.contract.spec.js` — also imports `makeUser, seedUsers` from contractHelper
- `api-user-contact-post.contract.spec.js` — also imports `makeUser, makeExchange, seedUsers, seedExchange` from contractHelper

For now, split the imports: `buildEvent` from specHelper, everything else stays from contractHelper until Task 3.

For example, in `api-giver-retry-post.contract.spec.js`, change:
```javascript
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';
```
to:
```javascript
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';
import {buildEvent} from '../specHelper.js';
```

Note: also update the mongoHelper imports to the new `spec/shared/mongoSetup.js` path for the integration files while here (these were going through contractHelper before, so they weren't caught in Task 1).

For `api-exchange-post.contract.spec.js`, change:
```javascript
import {setupMongo, teardownMongo, cleanCollections, buildEvent} from './contractHelper.js';
```
to:
```javascript
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {buildEvent} from '../specHelper.js';
```

- [ ] **Step 4: Run all backend tests**

Run: `npx vitest run --project backend`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add spec/specHelper.js spec/netlify-functions/ spec/integration/
git commit -m "refactor: move buildEvent to specHelper.js"
```

---

### Task 3: Expand `spec/testData.js` with full documents, factories, and seeding helpers

**Files:**
- Modify: `spec/testData.js`

- [ ] **Step 1: Rewrite `spec/testData.js` with all three sections**

```javascript
import {ObjectId} from 'mongodb';

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

;region Shared Test Data

export const alex = makeUser({name: 'Alex', email: 'alex@test.com'});
export const whitney = makeUser({name: 'Whitney', email: 'whitney@test.com'});
export const hunter = makeUser({name: 'Hunter', email: 'hunter@test.com'});
export const megan = makeUser({name: 'Megan', email: 'megan@test.com'});

export const twoPersonExchange = makeExchange({
    exchangeId: 'two-person-exchange',
    organizer: alex._id,
    createdAt: new Date('2025-12-01'),
    participants: [alex._id, whitney._id],
    assignments: [{giverId: alex._id, recipientId: whitney._id}],
});

export const threePersonExchange = makeExchange({
    exchangeId: 'three-person-exchange',
    organizer: alex._id,
    createdAt: new Date('2025-12-01'),
    participants: [alex._id, whitney._id, hunter._id],
    assignments: [
        {giverId: alex._id, recipientId: whitney._id},
        {giverId: whitney._id, recipientId: hunter._id},
        {giverId: hunter._id, recipientId: alex._id},
    ],
});

export const twoPersonSecretSanta = makeExchange({
    exchangeId: 'two-person-secret-santa',
    organizer: alex._id,
    createdAt: new Date('2025-12-01'),
    isSecretSanta: true,
    participants: [alex._id, whitney._id],
    assignments: [{giverId: alex._id, recipientId: whitney._id}],
});

export const threePersonSecretSanta = makeExchange({
    exchangeId: 'three-person-secret-santa',
    organizer: alex._id,
    createdAt: new Date('2025-12-01'),
    isSecretSanta: true,
    participants: [alex._id, whitney._id, hunter._id],
    assignments: [
        {giverId: alex._id, recipientId: whitney._id},
        {giverId: whitney._id, recipientId: hunter._id},
        {giverId: hunter._id, recipientId: alex._id},
    ],
});

;endregion

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

Note: All emails use `@test.com`. Frontend tests that currently assert on hardcoded `@gmail.com` values must be updated to reference the test data (e.g., `alex.email` instead of `"alex@gmail.com"`). The 4 frontend files that import the original names will also get additional fields (`_id`, `wishlists`, etc.) but this won't break them since they only access `.name` and `.email`.

- [ ] **Step 2: Update frontend tests to reference test data instead of hardcoded emails**

Frontend tests currently hardcode `@gmail.com` emails. Update them to reference the imported test data values.

**`spec/exchange/state.spec.js`** — Lines 437-439 and 542-543 build inline objects like `{name: "Alex", email: "alex@gmail.com"}`. These should use the imported test data. Lines 455-457 assert `toBe("alex@gmail.com")` — change to `toBe(alex.email)`.

**`spec/exchange/components/Name.spec.js`** — Line 34 asserts `toBe("alex@gmail.com")` — change to `toBe(alex.email)`.

**`spec/exchange/components/EmailTable/EmailTable.spec.js`** — Lines 166-169 build inline objects with `@gmail.com` emails. Line 400 builds `{name: "Alex", email: "alex@gmail.com"}` and line 403 asserts `toContain('value="alex@gmail.com"')` — change to `toContain(\`value="${alex.email}"\`)`. Note line 166 uses `arootroatch@gmail.com` which differs from the test data — update this to use `alex.email` or keep as an inline override if it's intentional.

- [ ] **Step 3: Run frontend tests**

Run: `npx vitest run --project frontend`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add spec/testData.js spec/exchange/
git commit -m "refactor: expand testData.js with factories, shared documents, and seeding helpers"
```

---

### Task 4: Migrate backend test files from `testFactories.js` to `testData.js`

**Files:**
- Modify: 11 files in `spec/netlify-functions/` that import `makeUser`/`makeExchange` from testFactories

After Task 2, these files import `makeUser`/`makeExchange` from `'../shared/testFactories.js'`. Change to import from `'../testData.js'`.

- [ ] **Step 1: Update imports in all 11 files**

Change `from '../shared/testFactories.js'` to `from '../testData.js'` in:
- `api-giver-retry-post.spec.js`
- `api-user-contact-post.spec.js`
- `api-recipient-get.spec.js`
- `api-user-wishlist-put.spec.js`
- `api-auth-code-post.spec.js`
- `api-results-email-post.spec.js`
- `api-user-get.spec.js`
- `api-user-wishlist-get.spec.js`
- `api-auth-verify-post.spec.js`

And `spec/dev/migrate-prices.spec.js` (imports `makeUser` from `'../shared/testFactories.js'` — change to `'../testData.js'`).

Where tests create users that match shared test data (e.g., `makeUser({name: 'Alice', email: 'alice@test.com'})`), also import the shared constant and use it instead. This is a case-by-case optimization — don't force it where tests need unique users for their specific scenario.

- [ ] **Step 2: Run backend tests**

Run: `npx vitest run --project backend`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add spec/netlify-functions/ spec/dev/
git commit -m "refactor: migrate backend tests from testFactories to testData"
```

---

### Task 5: Migrate integration tests from `contractHelper.js` to `testData.js`

**Files:**
- Modify: 4 files in `spec/integration/`

After Tasks 2 and 3, integration test files still import `makeUser`, `makeExchange`, `seedUsers`, `seedExchange` from `contractHelper.js`. Switch to `testData.js`.

- [ ] **Step 1: Update imports in all 4 integration files**

For `api-giver-retry-post.contract.spec.js`, change:
```javascript
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';
import {buildEvent} from '../specHelper.js';
```
to:
```javascript
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, makeExchange, seedUsers, seedExchange} from '../testData.js';
import {buildEvent} from '../specHelper.js';
```

Apply the same pattern for:
- `api-user-wishlist-put.contract.spec.js` — `makeUser, seedUsers` from testData
- `api-user-contact-post.contract.spec.js` — `makeUser, makeExchange, seedUsers, seedExchange` from testData
- `api-exchange-post.contract.spec.js` — already done (only uses buildEvent + mongo helpers)

- [ ] **Step 2: Delete `spec/integration/contractHelper.js`**

- [ ] **Step 3: Run backend tests**

Run: `npx vitest run --project backend`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add spec/integration/
git commit -m "refactor: migrate integration tests from contractHelper to testData, delete contractHelper"
```

---

### Task 6: Delete `spec/shared/testFactories.js`

**Files:**
- Delete: `spec/shared/testFactories.js`

- [ ] **Step 1: Verify no remaining imports of testFactories**

Run: `grep -r "testFactories" spec/ e2e/`
Expected: No matches (e2e/helpers.js still imports from it — update that first if found).

- [ ] **Step 2: Check `e2e/helpers.js` and remove its testFactories import**

The current line:
```javascript
export {makeUser, makeExchange} from '../spec/shared/testFactories.js';
```
Remove this line entirely — E2E tests will import from `testData.js` directly (handled in Task 7).

- [ ] **Step 3: Delete `spec/shared/testFactories.js`**

- [ ] **Step 4: Run backend tests**

Run: `npx vitest run --project backend`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add spec/shared/testFactories.js e2e/helpers.js
git commit -m "refactor: delete testFactories.js"
```

---

### Task 7: Migrate E2E tests to use shared infrastructure

**Files:**
- Modify: `e2e/globalSetup.js`
- Modify: `e2e/helpers.js`
- Modify: 5 E2E test files

- [ ] **Step 1: Update `e2e/globalSetup.js` to use shared MongoMemoryServer setup**

Replace the local `MongoMemoryServer.create()` with the shared `setup()` function. Change:
```javascript
const mongoServer = await MongoMemoryServer.create();
const mongoUri = mongoServer.getUri();
```
to:
```javascript
import {setup as startMongo, teardown as stopMongo} from '../spec/shared/mongoSetup.js';
```

And in the `globalSetup()` function:
```javascript
await startMongo();
const mongoUri = process.env.MONGO_DB_URI;
```

And in the teardown function returned at the end:
```javascript
return async () => {
    netlifyDev.kill('SIGTERM');
    await stopMongo();
    try { unlinkSync(STATE_FILE); } catch {}
};
```

Remove the `MongoMemoryServer` import from the file.

- [ ] **Step 2: Slim down `e2e/helpers.js`**

Remove the duplicated seeding/query functions. The file should become:

```javascript
import {MongoClient} from 'mongodb';
import {readFileSync} from 'fs';
import path from 'path';

const STATE_FILE = path.join(import.meta.dirname, '.e2e-state.json');
const JWT_SECRET = 'e2e-test-jwt-secret';

// Module-level DB state — safe because playwright.config.js enforces workers: 1
let client;
let db;

function requireDB() {
    if (!db) throw new Error('connectDB() must be called before using DB helpers');
    return db;
}

export function getDB() {
    return requireDB();
}

export async function connectDB() {
    let state;
    try {
        state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    } catch {
        throw new Error(`Cannot read ${STATE_FILE}. Is globalSetup running? Check that Playwright config points to globalSetup.js.`);
    }
    client = new MongoClient(state.mongoUri);
    await client.connect();
    db = client.db('e2e-test-db');

    // Set env vars needed by shared auth modules
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.MONGO_DB_URI = state.mongoUri;
    process.env.MONGODB_DATABASE = 'e2e-test-db';

    return db;
}

export async function disconnectDB() {
    if (client) await client.close();
}

export async function cleanDB() {
    const d = requireDB();
    await d.collection('exchanges').deleteMany({});
    await d.collection('users').deleteMany({});
    await d.collection('legacy-names').deleteMany({});
    await d.collection('authCodes').deleteMany({});
    await d.collection('rateLimits').deleteMany({});
}

/**
 * Authenticate programmatically by generating a code and calling the verify endpoint.
 * Sets the session cookie on the page context without going through the UI.
 */
export async function authenticateUser(page, baseURL, email, name) {
    const {generateAndStoreCode} = await import('../netlify/shared/authCodes.mjs');
    const code = await generateAndStoreCode(email);
    await page.request.post(`${baseURL}/.netlify/functions/api-auth-verify-post`, {
        data: {email, code, ...(name && {name})},
    });
}

/**
 * Authenticate through the auth gate UI. Pre-generates a known code, intercepts the
 * send-code API to prevent overwriting it, then fills in the auth gate form.
 */
export async function authenticateViaUI(page, email, name) {
    const {generateAndStoreCode} = await import('../netlify/shared/authCodes.mjs');
    const code = await generateAndStoreCode(email);

    // Intercept the code-send API so it doesn't generate a new code that overwrites ours
    await page.route('**/api-auth-code-post', route => {
        route.fulfill({status: 200, body: JSON.stringify({sent: true}), contentType: 'application/json'});
    });

    if (name) {
        await page.locator('#auth-name').fill(name);
    }
    await page.locator('#auth-email').fill(email);
    await page.locator('#auth-send-code').click();

    // Code step appears
    await page.locator('#auth-code').fill(code);

    // Unroute so the verify call goes through normally
    await page.unroute('**/api-auth-code-post');

    await page.locator('#auth-verify-code').click();
}
```

Key changes:
- Removed `makeUser`/`makeExchange` re-export
- Removed `seedUsers()`, `seedExchange()`, `findUser()`, `findExchange()`
- Added `getDB()` export so E2E tests can pass `db` to the shared seeding helpers from testData

- [ ] **Step 3: Update all 5 E2E test files**

Each E2E test file needs to:
1. Import `makeUser`, `makeExchange` from `'../spec/testData.js'` (or shared constants like `alice`, `bob`)
2. Import `seedUsers`, `seedExchange`, `findUser`, `findExchange` from `'../spec/testData.js'`
3. Import `connectDB`, `disconnectDB`, `cleanDB`, `getDB`, `authenticateUser`, `authenticateViaUI` from `'./helpers.js'`
4. Pass `getDB()` as the first argument to `seedUsers()`, `seedExchange()`, `findUser()`, `findExchange()`

Each E2E test file needs to:
1. Import `makeUser`, `makeExchange` from `'../spec/testData.js'` (or shared constants like `alex`, `whitney`)
2. Import `seedUsers`, `seedExchange`, `findUser`, `findExchange` from `'../spec/testData.js'`
3. Import `connectDB`, `disconnectDB`, `cleanDB`, `getDB`, `authenticateUser`, `authenticateViaUI` from `'./helpers.js'`
4. Pass `getDB()` as the first argument to `seedUsers()`, `seedExchange()`, `findUser()`, `findExchange()`
5. Replace inline `makeUser` calls with shared test data constants where they match (e.g., `makeUser({name: 'Alice', email: 'alice@test.com'})` becomes the shared `alex` or `whitney` etc.)

**`e2e/create-exchange.spec.js`:**

Change:
```javascript
import {connectDB, disconnectDB, cleanDB, findUser, findExchange, makeUser, makeExchange, seedUsers, seedExchange, authenticateUser, authenticateViaUI} from './helpers.js';
```
to:
```javascript
import {connectDB, disconnectDB, cleanDB, getDB, authenticateUser, authenticateViaUI} from './helpers.js';
import {alex, whitney, makeUser, makeExchange, seedUsers, seedExchange, findUser, findExchange} from '../spec/testData.js';
```

Update seeding calls to pass `getDB()`:
```javascript
// Before
await seedUsers(giver, recipient);
await seedExchange(makeExchange({...}));
const exchange = await findExchange({});

// After
await seedUsers(getDB(), giver, recipient);
await seedExchange(getDB(), makeExchange({...}));
const exchange = await findExchange(getDB(), {});
```

**`e2e/edit-wishlist.spec.js`:**

Change:
```javascript
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange, authenticateUser} from './helpers.js';
```
to:
```javascript
import {connectDB, disconnectDB, cleanDB, getDB, authenticateUser} from './helpers.js';
import {alex, whitney, makeExchange, seedUsers, seedExchange} from '../spec/testData.js';
```

Replace inline `makeUser` calls with shared constants:
```javascript
// Before
giver = makeUser({name: 'Alice', email: 'alice@test.com'});
recipient = makeUser({name: 'Bob', email: 'bob@test.com'});
await seedUsers(giver, recipient);

// After
await seedUsers(getDB(), alex, whitney);
```

Update all `seedExchange` calls and variable references (`giver` -> `alex`, `recipient` -> `whitney`).

**`e2e/auth-flow.spec.js`:**

Change:
```javascript
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange, authenticateUser, authenticateViaUI} from './helpers.js';
```
to:
```javascript
import {connectDB, disconnectDB, cleanDB, getDB, authenticateUser, authenticateViaUI} from './helpers.js';
import {alex, whitney, makeExchange, seedUsers, seedExchange} from '../spec/testData.js';
```

Replace inline `makeUser` calls with shared constants, pass `getDB()` to seeding calls. Update variable references (`alice` -> `alex`, `bob` -> `whitney`).

**`e2e/recipient-search.spec.js`:**

Change:
```javascript
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange, authenticateViaUI} from './helpers.js';
```
to:
```javascript
import {connectDB, disconnectDB, cleanDB, getDB, authenticateViaUI} from './helpers.js';
import {alex, makeUser, makeExchange, seedUsers, seedExchange} from '../spec/testData.js';
```

The `giver` can use shared `alex`, but `recipient` has custom wishlists so it stays as `makeUser(...)`. Pass `getDB()` to seeding calls:
```javascript
// Before
giver = makeUser({name: 'Alice', email: 'alice@test.com'});
recipient = makeUser({name: 'Bob', email: 'bob@test.com', wishlists: [...]});
await seedUsers(giver, recipient);
await seedExchange(makeExchange({...}));

// After (giver variable removed, use alex directly)
recipient = makeUser({name: 'Bob', email: 'bob@test.com', wishlists: [...]});
await seedUsers(getDB(), alex, recipient);
await seedExchange(getDB(), makeExchange({
    ...
    participants: [alex._id, recipient._id],
    assignments: [{giverId: alex._id, recipientId: recipient._id}],
}));
```

Update references from `giver` to `alex` throughout the test body.

**`e2e/reuse-exchange.spec.js`:**

Change:
```javascript
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange, authenticateUser, authenticateViaUI} from './helpers.js';
```
to:
```javascript
import {connectDB, disconnectDB, cleanDB, getDB, authenticateUser, authenticateViaUI} from './helpers.js';
import {alex, whitney, makeExchange, seedUsers, seedExchange} from '../spec/testData.js';
```

Replace inline `makeUser` calls with shared constants. Pass `getDB()` to seeding calls:
```javascript
// Before
alice = makeUser({name: 'Alice', email: 'alice@test.com'});
bob = makeUser({name: 'Bob', email: 'bob@test.com'});
await seedUsers(alice, bob);

// After (remove let declarations, use imports directly)
await seedUsers(getDB(), alex, whitney);
```

Remove the `let alice, bob` declarations at the top of the describe block (they shadow the imports). Keep `let exchangeId`. Update all references from `alice`/`bob` to `alex`/`whitney`.

- [ ] **Step 4: Run E2E tests**

Run: `npx playwright test`
Expected: All tests pass.

- [ ] **Step 5: Run all test suites to verify nothing is broken**

Run: `npx vitest run` and `npx playwright test`
Expected: All tests pass across frontend, frontend-pages, backend, and E2E.

- [ ] **Step 6: Commit**

```bash
git add e2e/ spec/testData.js
git commit -m "refactor: migrate E2E tests to shared test data and seeding helpers"
```

---

### Task 8: Clean up — delete old files and verify

**Files:**
- Delete: `spec/netlify-functions/mongoSetup.js` (if not already deleted in Task 1)
- Delete: `spec/netlify-functions/mongoHelper.js` (if not already deleted in Task 1)
- Verify: no stale imports remain

- [ ] **Step 1: Verify no remaining imports of deleted modules**

Run these searches and confirm zero matches:
```bash
grep -r "testFactories" spec/ e2e/
grep -r "contractHelper" spec/
grep -r "mongoHelper" spec/ e2e/
grep -r "netlify-functions/mongoSetup" spec/ e2e/ vitest.config.ts
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run` and `npx playwright test`
Expected: All tests pass.

- [ ] **Step 3: Commit any remaining cleanup**

```bash
git add -A
git commit -m "refactor: final cleanup of test infrastructure unification"
```
