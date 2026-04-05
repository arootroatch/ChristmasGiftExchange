---
name: backend-testing
description: Backend test patterns for Netlify serverless functions — MongoMemoryServer setup, buildEvent helper, auth cookie patterns, mock patterns, fixture requirements
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

- **`buildEvent(httpMethod, options?)`** helper constructs Netlify event objects (in `spec/shared/specHelper.js`)
  - Accepts `{body, path, queryStringParameters, headers}`
  - `httpMethod` is the first positional argument (e.g., `"GET"`, `"POST"`, `"PUT"`)
- **Dynamic `import()`** of handler module in `beforeAll` (after env setup) — ensures handler picks up test env vars
- **`vi.stubGlobal('fetch', mockFetch)`** for email-sending endpoints
- **`afterEach`** cleans collections; **`afterAll`** stops mongo + restores env

## Auth Cookie Pattern for Protected Endpoints

Protected endpoints use `requireAuth()` which reads the JWT from the `session` cookie. In tests, create a signed JWT and pass it via the `headers` option:

```js
import {makeUser} from '../shared/testData.js';
import {buildEvent} from '../shared/specHelper.js';

// In beforeAll (after env setup, before handler import):
process.env.JWT_SECRET = 'test-secret';

// Create auth cookie for a user:
const {signSession} = await import('../../netlify/shared/jwt.mjs');
const jwt = await signSession(userId.toString());
const event = buildEvent("GET", {headers: {cookie: `session=${jwt}`}});
```

For endpoints that set cookies (auth-verify, auth-logout), assert on `response.headers["Set-Cookie"]`.

## Auth Code Test Patterns

For testing `authCodes.mjs` (generateAndStoreCode, verifyCode):

```js
const {generateAndStoreCode, verifyCode} = await import('../../netlify/shared/authCodes.mjs');

const code = await generateAndStoreCode('user@test.com');
const result = await verifyCode('user@test.com', code);
expect(result.valid).toBe(true);
```

Auth codes require `JWT_SECRET` in env for HMAC hashing and `getAuthCodesCollection` from db.mjs.

## Test Fixture Requirements (Schema Enforced)

- Wishlist/wishItem url fields must be **valid URLs**
- Email fields must be **valid emails**

Zod schemas validate these at parse time — invalid fixtures will cause test failures.

## Shared Test Data & Factories (`spec/shared/testData.js`)

- `makeUser(overrides)` — Creates valid user document (with `_id` as ObjectId)
- `makeExchange(overrides)` — Creates valid exchange document
- `alex`, `whitney`, `hunter`, `megan` — Pre-built shared user documents
- `twoPersonExchange`, `threePersonExchange`, `twoPersonSecretSanta`, `threePersonSecretSanta` — Pre-built shared exchange documents
- `seedUsers(db, ...users)`, `seedExchange(db, exchange)` — DB insertion helpers
- `findUser(db, query)`, `findExchange(db, query)` — DB query helpers
- `buildEvent(httpMethod, options?)` — In `spec/shared/specHelper.js`; options: `{body, path, queryStringParameters, headers}`

## Contract/Integration Tests (`spec/integration/`)

- Each contract spec imports directly from `testData.js`, `specHelper.js`, and `shared/mongoSetup.js`
