---
name: backend-testing
description: Backend test patterns for Netlify serverless functions — MongoMemoryServer setup, buildEvent helper, mock patterns, fixture requirements
---

# Backend Test Patterns

Tests are in `spec/netlify-functions/`. Integration/contract tests in `spec/integration/`.

## Test Structure

```js
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer, handler;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_DB_URI = mongoServer.getUri();
  process.env.MONGODB_DATABASE = 'test';
  // Dynamic import AFTER env setup
  const mod = await import('../../netlify/functions/api-xxx.mjs');
  handler = mod.handler;
});

afterEach(async () => {
  // Clean collections between tests
  const collection = await getCollection();
  await collection.deleteMany({});
});

afterAll(async () => {
  await mongoServer.stop();
  // Restore env vars
});
```

## Key Patterns

- **`buildEvent(body)`** helper constructs Netlify event objects (in `spec/shared/testFactories.js`)
- **Dynamic `import()`** of handler module in `beforeAll` (after env setup) — ensures handler picks up test env vars
- **`vi.stubGlobal('fetch', mockFetch)`** for email-sending endpoints
- **`afterEach`** cleans collections; **`afterAll`** stops mongo + restores env

## Test Fixture Requirements (Schema Enforced)

- Token fields must be **valid UUIDs**
- Wishlist/wishItem url fields must be **valid URLs**
- Email fields must be **valid emails**

Zod schemas validate these at parse time — invalid fixtures will cause test failures.

## Shared Factories (`spec/shared/testFactories.js`)

- `makeUser(overrides)` — Creates valid user document
- `makeExchange(overrides)` — Creates valid exchange document
- `buildEvent(body)` — Constructs Netlify function event object

## Contract/Integration Tests (`spec/integration/`)

- `contractHelper.js` re-exports factories + mongo helpers
- Each contract spec mirrors its unit spec but hits real MongoDB
