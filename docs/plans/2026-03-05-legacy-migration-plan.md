# Legacy Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate legacy `names` collection data into `users` and `exchanges` collections so existing users can access new features (wishlists, reuse, etc).

**Architecture:** Standalone Node.js script using the same MongoDB driver already in the project. Groups legacy documents by exchange `id`, upserts users, then upserts exchanges with proper ObjectId references. Tested with MongoMemoryServer like other Netlify function tests.

**Tech Stack:** Node.js, mongodb driver, dotenv, vitest + mongodb-memory-server for tests

---

### Task 1: Migration Core Logic — `migrateLegacyData(db)`

The migration logic lives in a pure function that accepts a `db` object. This makes it testable with MongoMemoryServer and reusable from both the CLI script and tests.

**Files:**
- Create: `scripts/migrate-legacy.mjs`
- Create: `tests/scripts/migrate-legacy.spec.js`

**Step 1: Write the test — single exchange, 3 participants**

In `tests/scripts/migrate-legacy.spec.js`:

```js
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('migrateLegacyData', () => {
    let mongoServer;
    let client;
    let db;
    let migrateLegacyData;

    beforeAll(async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        mongoServer = await MongoMemoryServer.create();
        client = new MongoClient(mongoServer.getUri());
        await client.connect();
        db = client.db('test-db');

        const module = await import('../../scripts/migrate-legacy.mjs');
        migrateLegacyData = module.migrateLegacyData;
    });

    afterEach(async () => {
        await db.collection('names').deleteMany({});
        await db.collection('users').deleteMany({});
        await db.collection('exchanges').deleteMany({});
    });

    afterAll(async () => {
        vi.restoreAllMocks();
        await client.close();
        await mongoServer.stop();
    });

    it('creates users and exchange from legacy documents', async () => {
        await db.collection('names').insertMany([
            {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
            {name: 'Whitney', email: 'whitney@test.com', recipient: 'Hunter', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
            {name: 'Hunter', email: 'hunter@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        ]);

        const result = await migrateLegacyData(db, 'names');

        expect(result.usersCreated).toBe(3);
        expect(result.exchangesCreated).toBe(1);

        const users = await db.collection('users').find().toArray();
        expect(users).toHaveLength(3);
        expect(users.every(u => u.token)).toBe(true);
        expect(users.every(u => Array.isArray(u.wishlists))).toBe(true);
        expect(users.every(u => Array.isArray(u.wishItems))).toBe(true);

        const exchanges = await db.collection('exchanges').find().toArray();
        expect(exchanges).toHaveLength(1);
        expect(exchanges[0].exchangeId).toBe('ex-2024');
        expect(exchanges[0].isSecretSanta).toBe(true);
        expect(exchanges[0].houses).toEqual([]);
        expect(exchanges[0].participants).toHaveLength(3);
        expect(exchanges[0].assignments).toHaveLength(3);

        // Verify assignment references are correct
        const userMap = {};
        users.forEach(u => { userMap[u.name] = u._id; });

        const alexToWhitney = exchanges[0].assignments.find(
            a => a.giverId.equals(userMap['Alex'])
        );
        expect(alexToWhitney.recipientId.equals(userMap['Whitney'])).toBe(true);
    });
});
```

**Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/scripts/migrate-legacy.spec.js`
Expected: FAIL — module not found

**Step 3: Write the implementation**

In `scripts/migrate-legacy.mjs`:

```js
import crypto from 'crypto';

export async function migrateLegacyData(db, legacyCollectionName) {
    const legacyCol = db.collection(legacyCollectionName);
    const usersCol = db.collection('users');
    const exchangesCol = db.collection('exchanges');

    const allDocs = await legacyCol.find().toArray();
    console.log(`Found ${allDocs.length} legacy documents`);

    // Group by exchange id
    const exchangeGroups = {};
    for (const doc of allDocs) {
        if (!exchangeGroups[doc.id]) exchangeGroups[doc.id] = [];
        exchangeGroups[doc.id].push(doc);
    }
    console.log(`Found ${Object.keys(exchangeGroups).length} exchanges`);

    // Upsert all unique users (by email)
    const emailToUser = {};
    let usersCreated = 0;
    let usersSkipped = 0;

    for (const doc of allDocs) {
        if (emailToUser[doc.email]) continue;
        const result = await usersCol.findOneAndUpdate(
            {email: doc.email},
            {
                $set: {name: doc.name, email: doc.email},
                $setOnInsert: {
                    token: crypto.randomUUID(),
                    wishlists: [],
                    wishItems: [],
                },
            },
            {upsert: true, returnDocument: 'after'}
        );
        emailToUser[doc.email] = result;
        if (result.wishlists?.length === 0 && result.wishItems?.length === 0) {
            usersCreated++;
        } else {
            usersSkipped++;
        }
    }

    // Create exchanges
    let exchangesCreated = 0;
    let exchangesSkipped = 0;

    for (const [exchangeId, docs] of Object.entries(exchangeGroups)) {
        const existing = await exchangesCol.findOne({exchangeId});
        if (existing) {
            exchangesSkipped++;
            console.log(`Skipping exchange ${exchangeId} (already exists)`);
            continue;
        }

        // Build name-to-email lookup within this exchange
        const nameToEmail = {};
        for (const doc of docs) {
            nameToEmail[doc.name] = doc.email;
        }

        const participants = docs.map(doc => emailToUser[doc.email]._id);

        const assignments = docs.map(doc => ({
            giverId: emailToUser[doc.email]._id,
            recipientId: emailToUser[nameToEmail[doc.recipient]]._id,
        }));

        await exchangesCol.insertOne({
            exchangeId,
            createdAt: new Date(docs[0].date),
            isSecretSanta: true,
            houses: [],
            participants,
            assignments,
        });
        exchangesCreated++;
    }

    const summary = {usersCreated, usersSkipped, exchangesCreated, exchangesSkipped};
    console.log('Migration complete:', summary);
    return summary;
}
```

**Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/scripts/migrate-legacy.spec.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/migrate-legacy.mjs tests/scripts/migrate-legacy.spec.js
git commit -m "feat: add migrateLegacyData function with test for single exchange"
```

---

### Task 2: Test — Multiple Exchanges

**Files:**
- Modify: `tests/scripts/migrate-legacy.spec.js`

**Step 1: Write the test**

Add to the describe block:

```js
it('handles multiple exchanges across different dates', async () => {
    await db.collection('names').insertMany([
        {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        {name: 'Whitney', email: 'whitney@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        {name: 'Alex', email: 'alex@test.com', recipient: 'Hunter', date: '2023-12-01T00:00:00Z', id: 'ex-2023'},
        {name: 'Hunter', email: 'hunter@test.com', recipient: 'Alex', date: '2023-12-01T00:00:00Z', id: 'ex-2023'},
    ]);

    const result = await migrateLegacyData(db, 'names');

    expect(result.usersCreated).toBe(3);
    expect(result.exchangesCreated).toBe(2);

    const exchanges = await db.collection('exchanges').find().sort({createdAt: -1}).toArray();
    expect(exchanges).toHaveLength(2);
    expect(exchanges[0].exchangeId).toBe('ex-2024');
    expect(exchanges[0].participants).toHaveLength(2);
    expect(exchanges[1].exchangeId).toBe('ex-2023');
    expect(exchanges[1].participants).toHaveLength(2);
});
```

**Step 2: Run the test to verify it passes**

Run: `npx vitest run tests/scripts/migrate-legacy.spec.js`
Expected: PASS (existing implementation should handle this)

**Step 3: Commit**

```bash
git add tests/scripts/migrate-legacy.spec.js
git commit -m "test: add multiple exchanges migration test"
```

---

### Task 3: Test — Idempotency

**Files:**
- Modify: `tests/scripts/migrate-legacy.spec.js`

**Step 1: Write the test**

```js
it('is idempotent — running twice does not create duplicates', async () => {
    await db.collection('names').insertMany([
        {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        {name: 'Whitney', email: 'whitney@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
    ]);

    await migrateLegacyData(db, 'names');
    const result = await migrateLegacyData(db, 'names');

    expect(result.usersSkipped).toBe(2);
    expect(result.exchangesSkipped).toBe(1);
    expect(result.usersCreated).toBe(0);
    expect(result.exchangesCreated).toBe(0);

    const users = await db.collection('users').find().toArray();
    expect(users).toHaveLength(2);

    const exchanges = await db.collection('exchanges').find().toArray();
    expect(exchanges).toHaveLength(1);
});
```

**Step 2: Run the test to verify it passes**

Run: `npx vitest run tests/scripts/migrate-legacy.spec.js`
Expected: PASS — the upsert logic and `findOne` check should handle this.

Note: The `usersSkipped` count logic may need adjustment. The current implementation counts users as "created" based on empty wishlists/wishItems, which won't be accurate on a second run since the user already exists with empty arrays. Adjust the counting logic if needed: use the `upsertedCount` from the MongoDB result, or check if `result.lastErrorObject?.updatedExisting` is true.

If the test fails, fix the user counting in `migrateLegacyData`:

```js
// Replace the counting logic with:
const wasUpserted = !result.lastErrorObject?.updatedExisting;
// Or simpler: check if we got an upsertedId back
```

Actually, `findOneAndUpdate` with `returnDocument: 'after'` doesn't return upsert info in the same way. A cleaner approach: do a `findOne` first, then `findOneAndUpdate`. If `findOne` returned null, it's a create. If it returned a doc, it's a skip.

**Step 3: Fix implementation if needed, then commit**

```bash
git add tests/scripts/migrate-legacy.spec.js scripts/migrate-legacy.mjs
git commit -m "test: add idempotency test for migration"
```

---

### Task 4: Test — Preserves Existing User Data

**Files:**
- Modify: `tests/scripts/migrate-legacy.spec.js`

**Step 1: Write the test**

```js
it('preserves existing user wishlists and tokens', async () => {
    // Pre-existing user with wishlist data
    await db.collection('users').insertOne({
        name: 'Alex',
        email: 'alex@test.com',
        token: 'existing-token-123',
        wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
        wishItems: [{url: 'https://amazon.com/item', title: 'Cool Thing'}],
    });

    await db.collection('names').insertMany([
        {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        {name: 'Whitney', email: 'whitney@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
    ]);

    await migrateLegacyData(db, 'names');

    const alex = await db.collection('users').findOne({email: 'alex@test.com'});
    expect(alex.token).toBe('existing-token-123');
    expect(alex.wishlists).toHaveLength(1);
    expect(alex.wishItems).toHaveLength(1);
});
```

**Step 2: Run the test to verify it passes**

Run: `npx vitest run tests/scripts/migrate-legacy.spec.js`
Expected: PASS — `$setOnInsert` only applies on insert, not update

**Step 3: Commit**

```bash
git add tests/scripts/migrate-legacy.spec.js
git commit -m "test: verify migration preserves existing user data"
```

---

### Task 5: Test — Dry Run Mode

**Files:**
- Modify: `tests/scripts/migrate-legacy.spec.js`
- Modify: `scripts/migrate-legacy.mjs`

**Step 1: Write the failing test**

```js
it('dry run reports counts without writing data', async () => {
    await db.collection('names').insertMany([
        {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        {name: 'Whitney', email: 'whitney@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
    ]);

    const result = await migrateLegacyData(db, 'names', {dryRun: true});

    expect(result.usersCreated).toBe(2);
    expect(result.exchangesCreated).toBe(1);
    expect(result.dryRun).toBe(true);

    const users = await db.collection('users').find().toArray();
    expect(users).toHaveLength(0);

    const exchanges = await db.collection('exchanges').find().toArray();
    expect(exchanges).toHaveLength(0);
});
```

**Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/scripts/migrate-legacy.spec.js`
Expected: FAIL — dryRun option not implemented yet

**Step 3: Update `migrateLegacyData` signature and logic**

Update function signature to accept options:

```js
export async function migrateLegacyData(db, legacyCollectionName, options = {}) {
    const {dryRun = false} = options;
```

In the user upsert section, replace the write with a count when dry:

```js
if (emailToUser[doc.email]) continue;

if (dryRun) {
    const existing = await usersCol.findOne({email: doc.email});
    if (existing) {
        emailToUser[doc.email] = existing;
        usersSkipped++;
    } else {
        emailToUser[doc.email] = {_id: `dry-run-${doc.email}`, name: doc.name, email: doc.email};
        usersCreated++;
    }
    continue;
}
```

In the exchange section, for dry run just count without inserting:

```js
if (dryRun) {
    exchangesCreated++;
    continue;
}
```

Return `dryRun` in the summary:

```js
const summary = {usersCreated, usersSkipped, exchangesCreated, exchangesSkipped, dryRun};
```

**Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/scripts/migrate-legacy.spec.js`
Expected: PASS

**Step 5: Commit**

```bash
git add scripts/migrate-legacy.mjs tests/scripts/migrate-legacy.spec.js
git commit -m "feat: add dry-run mode to migration"
```

---

### Task 6: CLI Entry Point

**Files:**
- Create: `scripts/run-migration.mjs`

**Step 1: Write the CLI wrapper**

This is a thin script that connects to the real database and calls `migrateLegacyData`. No unit test needed — it's pure wiring.

In `scripts/run-migration.mjs`:

```js
import 'dotenv/config';
import {MongoClient} from 'mongodb';
import {migrateLegacyData} from './migrate-legacy.mjs';

const dryRun = process.argv.includes('--dry-run');

async function main() {
    const uri = process.env.MONGO_DB_URI;
    const dbName = process.env.MONGODB_DATABASE;
    const collectionName = process.env.MONGODB_COLLECTION;

    if (!uri || !dbName || !collectionName) {
        console.error('Missing required env vars: MONGO_DB_URI, MONGODB_DATABASE, MONGODB_COLLECTION');
        process.exit(1);
    }

    console.log(`Connecting to ${dbName}...`);
    if (dryRun) console.log('*** DRY RUN — no data will be written ***');

    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db(dbName);
        const result = await migrateLegacyData(db, collectionName, {dryRun});
        console.log('Result:', JSON.stringify(result, null, 2));
    } finally {
        await client.close();
    }
}

main().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
```

**Step 2: Test manually with dry run**

Run: `node scripts/run-migration.mjs --dry-run`
Expected: Should print env var error (no .env configured) or connect and report counts

**Step 3: Commit**

```bash
git add scripts/run-migration.mjs
git commit -m "feat: add CLI entry point for legacy migration"
```

---

### Task 7: Run All Tests and Final Commit

**Step 1: Run full test suite**

Run: `npx vitest run tests/scripts/migrate-legacy.spec.js`
Expected: All tests pass

**Step 2: Run existing tests to verify no regressions**

Run: `npx vitest run`
Expected: All tests pass

**Step 3: Final commit if any cleanup needed**

---

## Usage

```bash
# Dry run (preview only)
node scripts/run-migration.mjs --dry-run

# Real migration
node scripts/run-migration.mjs
```

Requires `.env` with `MONGO_DB_URI`, `MONGODB_DATABASE`, and `MONGODB_COLLECTION`.