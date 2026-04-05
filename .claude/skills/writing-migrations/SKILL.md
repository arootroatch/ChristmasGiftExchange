---
name: writing-migrations
description: How to create database migration files — naming, file contract, testing patterns, running locally and in CI
---

# Writing Migrations

Migrations live in `dev/migrations/` and run automatically in CI before each deploy. They also run manually via `npm run migrate:dev` or `npm run migrate:prod`.

## File Naming

Files are ordered by filename sort. Use date prefix + descriptive slug:

```
dev/migrations/20260401-clean-legacy-auth-codes.mjs
dev/migrations/20260401a-add-user-currency-default.mjs
dev/migrations/20260402-normalize-emails.mjs
```

Use an alpha suffix (`a`, `b`, etc.) when multiple migrations share a date.

## File Contract

Every migration file exports three things:

```js
export const description = 'Remove legacy used auth code documents';

export async function up(db) {
    await db.collection('authCodes').deleteMany({used: true});
}

export async function down(db) {
    // Reverse the up operation as best as possible
}
```

- `description` — Human-readable summary, shown in logs and stored in the `migrations` collection.
- `up(db)` — Receives a MongoDB `Db` instance. Performs the forward migration.
- `down(db)` — Receives a MongoDB `Db` instance. Reverses the `up` migration.

The `down` function should undo whatever `up` did. If a perfect reversal isn't possible (e.g., data was deleted), do the best approximation and document the limitation in a comment.

## Testing

Migration tests go in `spec/dev/migrations/` and follow the standard MongoDB test helper pattern:

```js
import {describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';

describe('20260401-clean-legacy-auth-codes', () => {
    let db, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
    });

    afterEach(async () => {
        await cleanCollections(db, 'authCodes');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it('up: removes documents with used flag', async () => {
        await db.collection('authCodes').insertMany([
            {email: 'a@test.com', used: true},
            {email: 'b@test.com', used: false},
        ]);

        const {up} = await import('../../../dev/migrations/20260401-clean-legacy-auth-codes.mjs');
        await up(db);

        const remaining = await db.collection('authCodes').find().toArray();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].email).toBe('b@test.com');
    });

    it('down: reverses the up operation', async () => {
        // Test the down function's reversal logic
    });
});
```

Key patterns:
- Import the migration's `up`/`down` functions directly — don't use the runner
- Set up realistic test data that exercises the migration's logic
- Test both `up` and `down`
- Clean only the collections your migration touches in `afterEach`

## Running Migrations

**Locally:**
```sh
npm run migrate:dev                                    # run all pending ups against local DB
npm run migrate:prod                                   # run all pending ups against production DB
npm run migrate:dev -- 20260401-some-migration         # migrate to specific target
```

**In CI:** Runs automatically before each deploy — staging runs against `gift-exchange-staging`, production against `gift-exchange`. No arguments needed; CI always runs all pending ups.

## How the Runner Works

The runner (`dev/run-migrations.mjs`):
1. Acquires a lock in the `migrations` collection (10-minute staleness timeout)
2. Discovers all `.mjs` files in `dev/migrations/`, sorted by filename
3. Reads executed migrations from the `migrations` collection
4. Computes a plan — which `up`s or `down`s to run to reach the target state
5. Executes sequentially, recording each success (or removing records on `down`)
6. Halts on first failure; already-completed steps stay recorded
7. Releases lock in a `finally` block

## Index Changes vs Migrations

**Don't use migrations for index changes.** Index definitions belong in schema files (`netlify/shared/schemas/*.mjs`) and are synced by `dev/sync-indexes.mjs`, which runs after migrations in CI. Migrations are for one-time data transforms.

## Archived Scripts

Legacy one-off migration scripts that predate this system live in `dev/migrations/archive/`. They are not discovered by the runner (it only globs `*.mjs` in the top-level `dev/migrations/` directory).