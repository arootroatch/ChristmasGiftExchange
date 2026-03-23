# Auth Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace permanent token auth with email verification codes + JWTs in httpOnly cookies, eliminating all persistent credentials.

**Architecture:** Single auth flow for all users: email → 8-digit code → JWT cookie. Auth middleware reads cookie on every request. Endpoints restored to proper HTTP methods (GET/PUT). No auth data in URLs or frontend code.

**Tech Stack:** Vanilla JS, Vite, Vitest + jsdom, Netlify Functions, MongoDB, Zod 4, jose (JWT), Postmark

**Spec:** `docs/superpowers/specs/2026-03-23-auth-architecture-design.md`

**Skills:** @backend-conventions, @backend-testing, @frontend-testing

**Notes:**
- All new backend tests use `buildEvent` from `spec/shared/testFactories.js`
- JWT tests need `JWT_SECRET` env var set in `beforeAll`
- Cookie-authenticated endpoints need `headers: {cookie: "session=<jwt>"}` in test events
- Install `jose` package before any JWT work
- Task 10 (remove token from schema) is deliberately placed AFTER Phase 3 endpoint conversions to avoid breaking everything at once
- `api-user-wishlist-get` uses `?exchangeId=` query param (not path param) for consistency with Netlify conventions
- `requireAuth` tests go in a separate spec file to avoid vi.mock conflicts with existing middleware spec
- Local `buildEvent` functions in existing test files also need `headers` support — update them alongside the shared factory

---

## File Structure

### New Files
- `netlify/shared/authCodes.mjs` — Code generation, hashing, storage, verification
- `netlify/shared/jwt.mjs` — JWT signing, verification, cookie helpers
- `netlify/functions/api-auth-code-post.mjs` — Send verification code
- `netlify/functions/api-auth-verify-post.mjs` — Verify code, set cookie
- `netlify/functions/api-auth-logout-post.mjs` — Clear session cookie
- `netlify/shared/emails/verificationCode.mjs` — Verification code email template
- `netlify/functions/api-recipient-get.mjs` — Restored GET (replaces api-recipient-post)
- `netlify/functions/api-my-exchanges-get.mjs` — Restored GET (replaces api-my-exchanges-post)
- `netlify/functions/api-user-get.mjs` — Restored GET (replaces api-user-post)
- `netlify/functions/api-user-wishlist-get.mjs` — Restored GET (replaces api-user-wishlist-view-post)
- `netlify/functions/api-user-wishlist-put.mjs` — Restored PUT (replaces api-user-wishlist-save-post)
- `src/authGate.js` — Shared auth gate UI component (email + code flow)
- Corresponding spec files for all new files

### Modified Files
- `netlify/shared/middleware.mjs` — Add `requireAuth()` integration
- `netlify/shared/responses.mjs` — Add `okWithHeaders()` for Set-Cookie
- `netlify/shared/db.mjs` — Add `getAuthCodesCollection()`
- `netlify/shared/schemas/user.mjs` — Remove `token` field
- `netlify/shared/links.mjs` — Remove token params from paths
- `netlify/shared/giverNotification.mjs` — Remove token from sendBatchEmails
- `netlify/shared/emails/secretSanta.mjs` — Remove token section, update links
- `netlify/shared/emails/wishlistNotification.mjs` — Update links
- `netlify/shared/emails/wishlistLink.mjs` — Update links
- `netlify/shared/emailProviders/postmark.mjs` — Register verificationCode template
- `netlify/functions/api-exchange-post.mjs` — Cookie auth, remove token from body
- `netlify/functions/api-results-email-post.mjs` — Cookie auth, remove token from body
- `netlify/functions/api-giver-retry-post.mjs` — Cookie auth, remove token from body
- `netlify/functions/api-wishlist-email-post.mjs` — Cookie auth, remove token from body
- `netlify/functions/api-user-contact-post.mjs` — Cookie auth, remove token from body
- `src/exchange/state.js` — Remove organizer token fields, simplify ORGANIZER_SET
- `src/exchange/components/OrganizerForm.js` — Two-step code flow
- `src/exchange/components/EmailTable/EmailTable.js` — Remove token from API calls
- `src/exchange/components/EmailTable/FailedEmails.js` — Remove token from retry
- `src/exchange/components/EmailTable/SendResults.js` — Remove token from API call
- `src/exchange/components/RecipientSearch.js` — Email + code flow
- `src/exchange/firstScreenTemplates.js` — Restore email input
- `src/reuse.js` — Email + code flow
- `src/wishlistEdit/index.js` — Auth gate on load
- `src/wishlistView.js` — Auth gate on load
- `dev/repl.mjs` — Remove token references
- `package.json` — Add jose dependency
- `.claude/CLAUDE.md` — Update auth architecture docs
- `.claude/skills/backend-conventions/SKILL.md` — Update endpoint patterns
- `.claude/skills/backend-testing/SKILL.md` — Document cookie auth testing
- `.claude/skills/frontend-testing/SKILL.md` — Document auth gate testing
- `.claude/skills/project-map/SKILL.md` — Update file tree

### Deleted Files
- `netlify/functions/api-organizer-post.mjs`
- `netlify/functions/api-token-email-post.mjs`
- `netlify/shared/emails/tokenRecovery.mjs`
- `netlify/shared/auth.mjs` — `getUserByToken` and `extractTokenFromPath` no longer needed
- `netlify/functions/api-recipient-post.mjs` — Replaced by GET version
- `netlify/functions/api-my-exchanges-post.mjs` — Replaced by GET version
- `netlify/functions/api-user-post.mjs` — Replaced by GET version
- `netlify/functions/api-user-wishlist-view-post.mjs` — Replaced by GET version
- `netlify/functions/api-user-wishlist-save-post.mjs` — Replaced by PUT version

---

## Phase 1: Auth Infrastructure

### Task 1: Install jose and Add Response Helper

**Files:**
- Modify: `package.json`
- Modify: `netlify/shared/responses.mjs`

- [ ] **Step 1: Install jose**

Run: `npm install jose`

- [ ] **Step 2: Add okWithHeaders to responses.mjs**

Add after `ok()` in `netlify/shared/responses.mjs`:

```js
export function okWithHeaders(data = {}, headers = {}) {
    return {statusCode: 200, headers: {"Content-Type": "application/json", ...headers}, body: JSON.stringify(data)};
}
```

- [ ] **Step 3: Run tests to verify nothing breaks**

Run: `npx vitest run`

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json netlify/shared/responses.mjs
git commit -m "chore: install jose, add okWithHeaders response helper"
```

---

### Task 2: Add authCodes Collection and Accessor

**Files:**
- Modify: `netlify/shared/db.mjs`

- [ ] **Step 1: Add getAuthCodesCollection to db.mjs**

Add after `getRateLimitsCollection`:

```js
export async function getAuthCodesCollection() {
    const db = await getDb();
    return db.collection("authCodes");
}
```

- [ ] **Step 2: Commit**

```bash
git add netlify/shared/db.mjs
git commit -m "feat: add getAuthCodesCollection accessor"
```

---

### Task 3: Create Auth Code Module

**Files:**
- Create: `netlify/shared/authCodes.mjs`
- Test: `spec/netlify-functions/authCodes.spec.js`

- [ ] **Step 1: Write failing tests**

```js
import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";

describe("authCodes", () => {
    let db, mongo, generateAndStoreCode, verifyCode;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret-key-for-hmac";
        const mod = await import("../../netlify/shared/authCodes.mjs");
        generateAndStoreCode = mod.generateAndStoreCode;
        verifyCode = mod.verifyCode;
    });

    afterEach(async () => {
        await cleanCollections(db, "authCodes");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    it("generates an 8-digit numeric code", async () => {
        const code = await generateAndStoreCode("test@test.com");
        expect(code).toMatch(/^\d{8}$/);
    });

    it("stores hashed code in authCodes collection", async () => {
        const code = await generateAndStoreCode("test@test.com");
        const doc = await db.collection("authCodes").findOne({email: "test@test.com"});
        expect(doc).not.toBeNull();
        expect(doc.codeHash).toBeDefined();
        expect(doc.codeHash).not.toBe(code); // hashed, not plaintext
        expect(doc.used).toBe(false);
        expect(doc.attempts).toBe(0);
        expect(doc.expiresAt).toBeInstanceOf(Date);
    });

    it("deletes existing codes when generating a new one", async () => {
        await generateAndStoreCode("test@test.com");
        await generateAndStoreCode("test@test.com");
        const count = await db.collection("authCodes").countDocuments({email: "test@test.com"});
        expect(count).toBe(1);
    });

    it("verifies a valid code", async () => {
        const code = await generateAndStoreCode("test@test.com");
        const result = await verifyCode("test@test.com", code);
        expect(result.valid).toBe(true);
    });

    it("marks code as used after verification", async () => {
        const code = await generateAndStoreCode("test@test.com");
        await verifyCode("test@test.com", code);
        const doc = await db.collection("authCodes").findOne({email: "test@test.com"});
        expect(doc.used).toBe(true);
    });

    it("rejects already-used code", async () => {
        const code = await generateAndStoreCode("test@test.com");
        await verifyCode("test@test.com", code);
        const result = await verifyCode("test@test.com", code);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Code already used");
    });

    it("rejects wrong code and increments attempts", async () => {
        await generateAndStoreCode("test@test.com");
        const result = await verifyCode("test@test.com", "00000000");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid code");
        const doc = await db.collection("authCodes").findOne({email: "test@test.com"});
        expect(doc.attempts).toBe(1);
    });

    it("locks after 5 failed attempts", async () => {
        await generateAndStoreCode("test@test.com");
        for (let i = 0; i < 5; i++) {
            await verifyCode("test@test.com", "00000000");
        }
        const result = await verifyCode("test@test.com", "00000000");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Too many attempts. Request a new code.");
    });

    it("rejects code for non-existent email", async () => {
        const result = await verifyCode("nobody@test.com", "12345678");
        expect(result.valid).toBe(false);
    });

    it("rejects expired code", async () => {
        const code = await generateAndStoreCode("test@test.com");
        // Manually set expiresAt to the past
        await db.collection("authCodes").updateOne(
            {email: "test@test.com"},
            {$set: {expiresAt: new Date(Date.now() - 60000)}}
        );
        const result = await verifyCode("test@test.com", code);
        expect(result.valid).toBe(false);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run spec/netlify-functions/authCodes.spec.js`

- [ ] **Step 3: Implement authCodes module**

```js
// netlify/shared/authCodes.mjs
import crypto from "crypto";
import {getAuthCodesCollection} from "./db.mjs";

function hmacHash(code) {
    const key = crypto.createHmac("sha256", process.env.JWT_SECRET)
        .update("auth-codes")
        .digest();
    return crypto.createHmac("sha256", key)
        .update(code)
        .digest("hex");
}

function generateCode() {
    return String(crypto.randomInt(10000000, 100000000));
}

export async function generateAndStoreCode(email) {
    const col = await getAuthCodesCollection();
    const code = generateCode();
    const codeHash = hmacHash(code);

    // Delete all existing codes for this email
    await col.deleteMany({email});

    await col.insertOne({
        email,
        codeHash,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        used: false,
        attempts: 0,
        createdAt: new Date(),
    });

    return code;
}

export async function verifyCode(email, code) {
    const col = await getAuthCodesCollection();
    const doc = await col.findOne({
        email,
        expiresAt: {$gt: new Date()},
    });

    if (!doc) return {valid: false, error: "Invalid code"};
    if (doc.used) return {valid: false, error: "Code already used"};
    if (doc.attempts >= 5) return {valid: false, error: "Too many attempts. Request a new code."};

    const codeHash = hmacHash(code);
    if (codeHash !== doc.codeHash) {
        await col.updateOne({_id: doc._id}, {$inc: {attempts: 1}});
        return {valid: false, error: "Invalid code"};
    }

    await col.updateOne({_id: doc._id}, {$set: {used: true}});
    return {valid: true};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run spec/netlify-functions/authCodes.spec.js`

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/authCodes.mjs spec/netlify-functions/authCodes.spec.js
git commit -m "feat: add auth code generation and verification module with HMAC-SHA256"
```

---

### Task 4: Create JWT Module

**Files:**
- Create: `netlify/shared/jwt.mjs`
- Test: `spec/netlify-functions/jwt.spec.js`

- [ ] **Step 1: Write failing tests**

```js
import {describe, it, expect, beforeAll, afterAll} from "vitest";

describe("jwt", () => {
    let signSession, verifySession, buildSessionCookie, clearSessionCookie, parseCookies;

    beforeAll(async () => {
        process.env.JWT_SECRET = "test-secret-key-for-jwt";
        const mod = await import("../../netlify/shared/jwt.mjs");
        signSession = mod.signSession;
        verifySession = mod.verifySession;
        buildSessionCookie = mod.buildSessionCookie;
        clearSessionCookie = mod.clearSessionCookie;
        parseCookies = mod.parseCookies;
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    it("signs and verifies a JWT", async () => {
        const jwt = await signSession("user-id-123");
        const payload = await verifySession(jwt);
        expect(payload.userId).toBe("user-id-123");
        expect(payload.exp).toBeDefined();
        expect(payload.iat).toBeDefined();
    });

    it("rejects an invalid JWT", async () => {
        const payload = await verifySession("invalid.jwt.token");
        expect(payload).toBeNull();
    });

    it("rejects an expired JWT", async () => {
        // Sign with -1 hour expiry (already expired)
        const mod = await import("../../netlify/shared/jwt.mjs");
        // We'll test this by verifying that exp is in the future for a valid token
        const jwt = await signSession("user-id-123");
        const payload = await verifySession(jwt);
        expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("builds a Set-Cookie header string", () => {
        const cookie = buildSessionCookie("jwt-token-here");
        expect(cookie).toContain("session=jwt-token-here");
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("Secure");
        expect(cookie).toContain("SameSite=Strict");
        expect(cookie).toContain("Path=/");
        expect(cookie).toContain("Max-Age=172800");
    });

    it("builds a clearing cookie header", () => {
        const cookie = clearSessionCookie();
        expect(cookie).toContain("session=");
        expect(cookie).toContain("Max-Age=0");
    });

    it("parses cookies from header string", () => {
        const cookies = parseCookies("session=abc123; other=xyz");
        expect(cookies.session).toBe("abc123");
        expect(cookies.other).toBe("xyz");
    });

    it("returns empty object for missing cookie header", () => {
        const cookies = parseCookies(undefined);
        expect(cookies).toEqual({});
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement jwt module**

```js
// netlify/shared/jwt.mjs
import {SignJWT, jwtVerify} from "jose";

const SESSION_MAX_AGE = 172800; // 48 hours in seconds

function getSecret() {
    return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function signSession(userId) {
    return new SignJWT({userId})
        .setProtectedHeader({alg: "HS256"})
        .setIssuedAt()
        .setExpirationTime(`${SESSION_MAX_AGE}s`)
        .sign(getSecret());
}

export async function verifySession(token) {
    try {
        const {payload} = await jwtVerify(token, getSecret());
        return payload;
    } catch {
        return null;
    }
}

export function buildSessionCookie(jwt) {
    return `session=${jwt}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookie() {
    return "session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0";
}

export function parseCookies(cookieHeader) {
    if (!cookieHeader) return {};
    return Object.fromEntries(
        cookieHeader.split(";").map(c => {
            const [key, ...rest] = c.trim().split("=");
            return [key, rest.join("=")];
        })
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add netlify/shared/jwt.mjs spec/netlify-functions/jwt.spec.js
git commit -m "feat: add JWT signing, verification, and cookie helpers using jose"
```

---

### Task 5: Add Origin Validation and requireAuth Middleware

**Files:**
- Modify: `netlify/shared/middleware.mjs`
- Create: `spec/netlify-functions/requireAuth.spec.js` (separate file to avoid vi.mock conflicts with existing middleware spec)

- [ ] **Step 1: Write failing tests**

Create `spec/netlify-functions/requireAuth.spec.js` (separate file — the existing middleware.spec.js uses vi.mock which conflicts with dynamic imports):

```js
import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";

describe("requireAuth", () => {
    let mongo, db, requireAuth, signSession;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret-key";
        const middlewareMod = await import("../../netlify/shared/middleware.mjs");
        requireAuth = middlewareMod.requireAuth;
        const jwtMod = await import("../../netlify/shared/jwt.mjs");
        signSession = jwtMod.signSession;
    });

    afterEach(async () => {
        await cleanCollections(db, "users");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    it("returns 401 when no cookie present", async () => {
        const event = {headers: {}};
        const result = await requireAuth(event);
        expect(result.statusCode).toBe(401);
    });

    it("returns 401 for invalid JWT", async () => {
        const event = {headers: {cookie: "session=invalid.jwt"}};
        const result = await requireAuth(event);
        expect(result.statusCode).toBe(401);
    });

    it("returns 401 when user not found in DB", async () => {
        const {ObjectId} = await import("mongodb");
        const jwt = await signSession(new ObjectId().toString());
        const event = {headers: {cookie: `session=${jwt}`}};
        const result = await requireAuth(event);
        expect(result.statusCode).toBe(401);
    });

    it("attaches user to event and returns null on success", async () => {
        const {ObjectId} = await import("mongodb");
        const userId = new ObjectId();
        await db.collection("users").insertOne({_id: userId, name: "Test", email: "test@test.com", wishlists: [], wishItems: []});

        const jwt = await signSession(userId.toString());
        const event = {headers: {cookie: `session=${jwt}`}};
        const result = await requireAuth(event);
        expect(result).toBeNull();
        expect(event.user).toBeDefined();
        expect(event.user.name).toBe("Test");
    });
});

describe("validateOrigin", () => {
    let validateOrigin;

    beforeAll(async () => {
        process.env.URL = "https://giftexchangegenerator.netlify.app";
        const mod = await import("../../netlify/shared/middleware.mjs");
        validateOrigin = mod.validateOrigin;
    });

    it("allows requests with matching origin", () => {
        const event = {headers: {origin: "https://giftexchangegenerator.netlify.app"}};
        expect(validateOrigin(event)).toBeNull();
    });

    it("rejects requests with mismatched origin", () => {
        const event = {headers: {origin: "https://evil.com"}};
        const result = validateOrigin(event);
        expect(result.statusCode).toBe(403);
    });

    it("allows requests with no origin header", () => {
        const event = {headers: {}};
        expect(validateOrigin(event)).toBeNull();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement requireAuth and validateOrigin**

Add to `netlify/shared/middleware.mjs`:

```js
import {verifySession, parseCookies} from "./jwt.mjs";
import {ObjectId} from "mongodb";

export function validateOrigin(event) {
    const origin = event.headers?.origin;
    if (origin && origin !== process.env.URL) {
        return forbidden("Forbidden");
    }
    return null;
}

export async function requireAuth(event) {
    const cookies = parseCookies(event.headers?.cookie);
    if (!cookies.session) return unauthorized("Authentication required");

    const payload = await verifySession(cookies.session);
    if (!payload?.userId) return unauthorized("Invalid session");

    let userId;
    try {
        userId = new ObjectId(payload.userId);
    } catch {
        return unauthorized("Invalid session");
    }

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({_id: userId});
    if (!user) return unauthorized("User not found");

    event.user = user;
    return null;
}
```

Also add origin validation to `apiHandler` — insert before rate limiting:

```js
const originError = validateOrigin(event);
if (originError) return originError;
```
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`

- [ ] **Step 6: Commit**

```bash
git add netlify/shared/middleware.mjs spec/netlify-functions/requireAuth.spec.js
git commit -m "feat: add requireAuth middleware and origin validation for cookie-based JWT auth"
```

---

### Task 6: Create Verification Code Email Template

**Files:**
- Create: `netlify/shared/emails/verificationCode.mjs`
- Modify: `netlify/shared/emailProviders/postmark.mjs` — Register template

- [ ] **Step 1: Create the template**

```js
// netlify/shared/emails/verificationCode.mjs
import {layout} from './layout.mjs';
import {escapeHtml} from './escapeHtml.mjs';

export function render({code}) {
    return layout(`
    <tr>
        <td align="center" style="padding-top: 50px; padding-bottom: 30px; font-size: 36px; color: #69292a;">
            Your Verification Code
        </td>
    </tr>
    <tr>
        <td align="center" style="padding: 0 50px 20px;">
            <span style="display: inline-block; font-size: 36px; font-family: monospace; letter-spacing: 8px; color: #198c0a; font-weight: bold; padding: 20px 32px;
                         background: #fff; border-radius: 10px; border: 2px solid #198c0a;
                         box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                ${escapeHtml(code)}
            </span>
        </td>
    </tr>
    <tr>
        <td align="center" style="font-size: 16px; padding: 0 50px 30px; color: #555;">
            Enter this code on the Gift Exchange Generator website to continue. This code expires in 10 minutes.
        </td>
    </tr>`);
}
```

- [ ] **Step 2: Register template in postmark.mjs**

Add `"verification-code"` to the `templateModules` map in `netlify/shared/emailProviders/postmark.mjs`, pointing to `../emails/verificationCode.mjs`.

- [ ] **Step 3: Commit**

```bash
git add netlify/shared/emails/verificationCode.mjs netlify/shared/emailProviders/postmark.mjs
git commit -m "feat: add verification code email template"
```

---

### Task 7: Create api-auth-code-post Endpoint

**Files:**
- Create: `netlify/functions/api-auth-code-post.mjs`
- Test: `spec/netlify-functions/api-auth-code-post.spec.js`

- [ ] **Step 1: Write failing tests**

Tests should cover:
- Rejects non-POST (405)
- Rejects missing email (400)
- Rejects invalid email (400)
- Returns `{sent: true}` for existing user and sends verification email
- Returns `{sent: true}` for non-existent email (anti-enumeration) — does NOT send email
- Rate limited at 3/min

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement**

```js
// netlify/functions/api-auth-code-post.mjs
import {z} from "zod";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {ok, badRequest} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {generateAndStoreCode} from "../shared/authCodes.mjs";
import {sendNotificationEmail} from "../shared/giverNotification.mjs";

const requestSchema = z.object({
    email: z.email(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const usersCol = await getUsersCollection();
    const user = await usersCol.findOne({email: data.email.trim()});

    if (user) {
        const code = await generateAndStoreCode(data.email.trim());
        await sendNotificationEmail(
            "verification-code",
            data.email.trim(),
            "Your Gift Exchange Verification Code",
            {code}
        );
    }

    return ok({sent: true});
}, {maxRequests: 3, windowMs: 60000});
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-auth-code-post.mjs spec/netlify-functions/api-auth-code-post.spec.js
git commit -m "feat: add api-auth-code-post for sending verification codes"
```

---

### Task 8: Create api-auth-verify-post Endpoint

**Files:**
- Create: `netlify/functions/api-auth-verify-post.mjs`
- Test: `spec/netlify-functions/api-auth-verify-post.spec.js`

- [ ] **Step 1: Write failing tests**

Tests should cover:
- Rejects missing email/code (400)
- Returns 401 for invalid code
- Returns 401 when user not found and no name provided
- Upserts user when name provided (creates new user)
- Updates name for existing user when name provided
- Sets httpOnly cookie with JWT on success (check `Set-Cookie` header)
- Returns `{success: true}`
- Marks code as used
- Rate limited at 5/min

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement**

```js
// netlify/functions/api-auth-verify-post.mjs
import {z} from "zod";
import crypto from "crypto";
import {apiHandler, validateBody} from "../shared/middleware.mjs";
import {badRequest, unauthorized, okWithHeaders} from "../shared/responses.mjs";
import {getUsersCollection} from "../shared/db.mjs";
import {verifyCode} from "../shared/authCodes.mjs";
import {signSession, buildSessionCookie} from "../shared/jwt.mjs";

const requestSchema = z.object({
    email: z.email(),
    code: z.string(),
    name: z.string().optional(),
});

export const handler = apiHandler("POST", async (event) => {
    const {data, error} = validateBody(requestSchema, event);
    if (error) return badRequest(error);

    const email = data.email.trim();
    const result = await verifyCode(email, data.code);
    if (!result.valid) return unauthorized(result.error);

    const usersCol = await getUsersCollection();
    let user;

    if (data.name) {
        user = await usersCol.findOneAndUpdate(
            {email},
            {
                $set: {name: data.name, email},
                $setOnInsert: {wishlists: [], wishItems: []},
            },
            {upsert: true, returnDocument: "after"}
        );
    } else {
        user = await usersCol.findOne({email});
        if (!user) return unauthorized("Authentication failed");
    }

    const jwt = await signSession(user._id.toString());
    return okWithHeaders(
        {success: true},
        {"Set-Cookie": buildSessionCookie(jwt)}
    );
}, {maxRequests: 5, windowMs: 60000});
```

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add netlify/functions/api-auth-verify-post.mjs spec/netlify-functions/api-auth-verify-post.spec.js
git commit -m "feat: add api-auth-verify-post with JWT cookie session creation"
```

---

### Task 9: Create api-auth-logout-post Endpoint

**Files:**
- Create: `netlify/functions/api-auth-logout-post.mjs`
- Test: `spec/netlify-functions/api-auth-logout-post.spec.js`

- [ ] **Step 1: Write failing tests**

Test: returns `{success: true}` with a cookie-clearing `Set-Cookie` header containing `Max-Age=0`.

- [ ] **Step 2: Implement**

```js
// netlify/functions/api-auth-logout-post.mjs
import {apiHandler} from "../shared/middleware.mjs";
import {okWithHeaders} from "../shared/responses.mjs";
import {clearSessionCookie} from "../shared/jwt.mjs";

export const handler = apiHandler("POST", async () => {
    return okWithHeaders({success: true}, {"Set-Cookie": clearSessionCookie()});
});
```

- [ ] **Step 3: Run tests, commit**

```bash
git add netlify/functions/api-auth-logout-post.mjs spec/netlify-functions/api-auth-logout-post.spec.js
git commit -m "feat: add api-auth-logout-post to clear session cookie"
```

---

## Phase 2: Convert Endpoints to Cookie Auth

### Task 10: Update buildEvent to Support Headers

**Files:**
- Modify: `spec/shared/testFactories.js`

- [ ] **Step 1: Add headers parameter to buildEvent**

```js
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

Also update any local `buildEvent` definitions in existing test files that override the shared factory — search for `function buildEvent` in spec files and add `headers` support to each.

- [ ] **Step 2: Run full suite to verify nothing breaks, commit**

```bash
git add spec/
git commit -m "feat: add headers parameter to buildEvent test factory for cookie auth"
```

---

### Task 11: Convert api-exchange-post to Cookie Auth

**Files:**
- Modify: `netlify/functions/api-exchange-post.mjs`
- Update: `spec/netlify-functions/api-exchange-post.spec.js`
- Update: `spec/integration/api-exchange-post.contract.spec.js`

- [ ] **Step 1: Update endpoint**

Remove `token` from the request schema. Replace the manual token lookup with `requireAuth`. Also remove `token: crypto.randomUUID()` from `$setOnInsert` in `upsertParticipants` and remove the `import crypto` if no longer needed:

```js
import {requireAuth} from "../shared/middleware.mjs";

export const handler = apiHandler("POST", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;

    const {data, error} = validateBody(exchangePostRequestSchema, event);
    if (error) return badRequest(error);

    // event.user is now set by requireAuth
    const exchangeDoc = buildExchangeDoc(...);
    exchangeDoc.organizer = event.user._id;
    // ...rest unchanged
});
```

- [ ] **Step 2: Update tests**

All tests need to set a session cookie instead of including a token in the body. Create a helper:

```js
async function authCookie(userId) {
    const {signSession} = await import("../../netlify/shared/jwt.mjs");
    const jwt = await signSession(userId.toString());
    return `session=${jwt}`;
}
```

Update `buildEvent` calls to include `headers: {cookie: await authCookie(organizer._id)}`.

- [ ] **Step 3: Run tests, commit**

```bash
git add netlify/functions/api-exchange-post.mjs spec/
git commit -m "feat: convert api-exchange-post to cookie-based auth"
```

---

### Task 12: Convert api-results-email-post to Cookie Auth

**Files:** `netlify/functions/api-results-email-post.mjs`, corresponding spec

- [ ] Remove `token` from request schema
- [ ] Add `requireAuth(event)` at top of handler, use `event.user`
- [ ] Update tests to use cookie auth (set `headers: {cookie: ...}` in buildEvent)
- [ ] Run tests, commit

```bash
git add netlify/functions/api-results-email-post.mjs spec/
git commit -m "feat: convert api-results-email-post to cookie-based auth"
```

---

### Task 13: Convert api-giver-retry-post to Cookie Auth

**Files:** `netlify/functions/api-giver-retry-post.mjs`, corresponding spec

- [ ] Same pattern as Task 12: remove token, add requireAuth, update tests
- [ ] Run tests, commit

```bash
git add netlify/functions/api-giver-retry-post.mjs spec/
git commit -m "feat: convert api-giver-retry-post to cookie-based auth"
```

---

### Task 14: Convert api-wishlist-email-post to Cookie Auth

**Files:** `netlify/functions/api-wishlist-email-post.mjs`, corresponding spec

- [ ] Same pattern: remove token, add requireAuth, update tests
- [ ] Run tests, commit

```bash
git add netlify/functions/api-wishlist-email-post.mjs spec/
git commit -m "feat: convert api-wishlist-email-post to cookie-based auth"
```

---

### Task 15: Convert api-user-contact-post to Cookie Auth

**Files:** `netlify/functions/api-user-contact-post.mjs`, corresponding spec

- [ ] Same pattern: remove token, add requireAuth, update tests
- [ ] Run tests, commit

```bash
git add netlify/functions/api-user-contact-post.mjs spec/
git commit -m "feat: convert api-user-contact-post to cookie-based auth"
```

---

### Task 16: Restore GET Endpoints with Cookie Auth

**Files:** Create new GET versions, delete old POST versions.

For each: api-recipient, api-my-exchanges, api-user, api-user-wishlist-view

- [ ] **Step 1: Create api-recipient-get.mjs**

```js
export const handler = apiHandler("GET", async (event) => {
    const authError = await requireAuth(event);
    if (authError) return authError;
    // Same logic as api-recipient-post but use event.user instead of token lookup
}, {maxRequests: 30, windowMs: 60000});
```

- [ ] **Step 2: Create api-my-exchanges-get.mjs**

Same pattern — GET, cookie auth, same response (no assignments).

- [ ] **Step 3: Create api-user-get.mjs**

Same pattern — GET, cookie auth, returns `{name, wishlists, wishItems}`.

- [ ] **Step 4: Create api-user-wishlist-get.mjs**

GET with `?exchangeId=` query parameter (consistent with Netlify conventions — not path params). Cookie auth. Verify giver access.

- [ ] **Step 5: Create tests for all four**

- [ ] **Step 6: Delete old POST versions**

```bash
rm netlify/functions/api-recipient-post.mjs netlify/functions/api-my-exchanges-post.mjs netlify/functions/api-user-post.mjs netlify/functions/api-user-wishlist-view-post.mjs
```

- [ ] **Step 7: Run full suite, commit**

```bash
git add -A
git commit -m "feat: restore GET endpoints with cookie-based auth"
```

---

### Task 17: Restore api-user-wishlist-put with Cookie Auth

**Files:**
- Create: `netlify/functions/api-user-wishlist-put.mjs`
- Delete: `netlify/functions/api-user-wishlist-save-post.mjs`
- Test: `spec/netlify-functions/api-user-wishlist-put.spec.js`

- [ ] **Step 1: Create api-user-wishlist-put.mjs**

PUT handler with cookie auth. Request body: `{wishlists, wishItems}` (no token). Uses `event.user` from `requireAuth`.

- [ ] **Step 2: Write tests, delete old POST version**

- [ ] **Step 3: Run full suite, commit**

```bash
git add -A
git commit -m "feat: restore api-user-wishlist-put with cookie-based auth"
```

---

### Task 18: Remove Obsolete Endpoints and Templates

**Files:**
- Delete: `netlify/functions/api-organizer-post.mjs`
- Delete: `netlify/functions/api-token-email-post.mjs`
- Delete: `netlify/shared/emails/tokenRecovery.mjs`
- Delete corresponding test and contract files

- [ ] **Step 1: Delete files**

```bash
rm netlify/functions/api-organizer-post.mjs netlify/functions/api-token-email-post.mjs netlify/shared/emails/tokenRecovery.mjs
```

- [ ] **Step 2: Delete test files**

Delete all corresponding spec files.

- [ ] **Step 3: Remove template registration**

Remove `"token-recovery"` from `templateModules` in `postmark.mjs`.

- [ ] **Step 4: Run full suite, fix any import failures, commit**

```bash
git add -A
git commit -m "chore: remove api-organizer-post, api-token-email-post, and tokenRecovery template"
```

---

## Phase 3: Remove Token System

### Task 19: Remove Token from User Schema and Auth Module

**Why deferred to here:** All endpoints are now converted to cookie auth. Removing the token field and auth.mjs is now safe — nothing depends on them.

**Files:**
- Modify: `netlify/shared/schemas/user.mjs` — Remove `token: z.uuid()`
- Modify: `spec/shared/testFactories.js` — Remove token from makeUser
- Delete: `netlify/shared/auth.mjs` — getUserByToken and extractTokenFromPath no longer used
- Delete: `spec/netlify-functions/auth.spec.js`

- [ ] **Step 1: Remove token from userSchema**

In `netlify/shared/schemas/user.mjs`, remove `token: z.uuid()`.

- [ ] **Step 2: Remove token from makeUser factory**

In `spec/shared/testFactories.js`, remove `token` from `makeUser` defaults and parameters.

- [ ] **Step 3: Delete auth.mjs and its tests**

```bash
rm netlify/shared/auth.mjs spec/netlify-functions/auth.spec.js
```

- [ ] **Step 4: Remove any remaining auth.mjs imports**

Search: `grep -rn "auth.mjs" netlify/ spec/ --include="*.mjs" --include="*.js"`
Remove any remaining imports of `getUserByToken` or `extractTokenFromPath`.

- [ ] **Step 5: Run full test suite, fix any failures**

Tests that create users with `token` field will need updating. The token field is no longer in the schema so Zod validation (where used) may strip or reject it. Fix each failing test.

Run: `npx vitest run`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: remove token field from user schema, delete auth.mjs"
```

---

## Phase 4: Email and Link Updates

### Task 20: Update Links Module

**Files:**
- Modify: `netlify/shared/links.mjs`
- Update all callers

- [ ] **Step 1: Update links.mjs**

```js
export function wishlistEditPath() {
    return "/wishlist/edit";
}

export function wishlistViewPath(exchangeId) {
    return `/wishlist/view?exchange=${exchangeId}`;
}

export function absoluteUrl(path) {
    return `${process.env.URL}${path}`;
}
```

- [ ] **Step 2: Update all callers to new signatures**

Search for `wishlistEditPath(` and `wishlistViewPath(` — update argument lists. Key files:
- `giverNotification.mjs` — `sendBatchEmails` passes token to these; remove token
- `api-wishlist-email-post.mjs` — uses `wishlistViewPath(user.token, data.exchangeId)`
- `api-user-wishlist-put.mjs` — giver notification uses `wishlistViewPath(giver.token, ...)`
- Email templates that use these paths

- [ ] **Step 3: Run full suite, fix, commit**

```bash
git add -A
git commit -m "feat: update links module to remove auth data from URLs"
```

---

### Task 21: Update Email Templates

**Files:**
- Modify: `netlify/shared/emails/secretSanta.mjs`
- Modify: `netlify/shared/emails/wishlistNotification.mjs`
- Modify: `netlify/shared/emails/wishlistLink.mjs`
- Modify: `netlify/shared/giverNotification.mjs`

- [ ] **Step 1: Update secretSanta.mjs**

Remove `token` from render params. Remove the token display section (lines ~58-77). Remove "save this token" message. Update the closing paragraph to: "If you need to access your exchange, visit the website and enter your email to get a verification code."

- [ ] **Step 2: Update sendBatchEmails in giverNotification.mjs**

Remove `token` from the parameters object. Update `wishlistEditUrl` and `wishlistViewUrl` calls to use parameterless helpers.

- [ ] **Step 3: Update wishlistNotification.mjs and wishlistLink.mjs**

Update link construction to use new parameterless helpers.

- [ ] **Step 4: Run full suite, fix, commit**

```bash
git add -A
git commit -m "feat: remove auth data from all email templates and links"
```

---

## Phase 5: Frontend Changes

### Task 22: Create Shared Auth Gate Component

**Files:**
- Create: `src/authGate.js`
- Test: `spec/authGate.spec.js`

- [ ] **Step 1: Create authGate module**

A reusable module that handles the email → code → verify flow. Used by OrganizerForm, RecipientSearch, Reuse, wishlist edit, wishlist view.

```js
// src/authGate.js
import {apiFetch} from "./utils.js";

export function authGateTemplate({heading, showName}) {
    return `
        <div id="auth-gate">
            <h2>${heading || "Verify Your Email"}</h2>
            <div id="auth-email-step">
                ${showName ? '<label>Your name<input type="text" id="auth-name" required></label>' : ''}
                <label>Your email<input type="email" id="auth-email" required></label>
                <button id="auth-send-code">Send Verification Code</button>
            </div>
            <div id="auth-code-step" style="display: none;">
                <p>Check your email for a verification code</p>
                <label>Verification code<input type="text" id="auth-code" inputmode="numeric" maxlength="8" required></label>
                <button id="auth-verify-code">Verify</button>
            </div>
        </div>`;
}

export function initAuthGate({onSuccess, onError, showName}) {
    // Wire up email step
    document.getElementById("auth-send-code").addEventListener("click", () => {
        const email = document.getElementById("auth-email").value.trim();
        if (!email) return;
        apiFetch("/.netlify/functions/api-auth-code-post", {
            method: "POST",
            body: {email},
            onSuccess: () => {
                document.getElementById("auth-email-step").style.display = "none";
                document.getElementById("auth-code-step").style.display = "";
            },
            onError: onError || (() => {}),
        });
    });

    // Wire up code step
    document.getElementById("auth-verify-code").addEventListener("click", () => {
        const email = document.getElementById("auth-email").value.trim();
        const code = document.getElementById("auth-code").value.trim();
        const name = showName ? document.getElementById("auth-name")?.value.trim() : undefined;
        if (!code) return;
        apiFetch("/.netlify/functions/api-auth-verify-post", {
            method: "POST",
            body: {email, code, ...(name && {name})},
            onSuccess: () => onSuccess({email, name}),
            onError: onError || (() => {}),
        });
    });
}
```

- [ ] **Step 2: Write tests**

Test the template renders correctly and the flow calls the right endpoints.

- [ ] **Step 3: Commit**

```bash
git add src/authGate.js spec/authGate.spec.js
git commit -m "feat: add shared auth gate component for email + code verification flow"
```

---

### Task 23: Update OrganizerForm to Use Auth Gate

**Files:**
- Modify: `src/exchange/components/OrganizerForm.js`
- Modify: `src/exchange/state.js` — Remove token from organizer state
- Update: `spec/exchange/components/OrganizerForm.spec.js`
- Update: `spec/exchange/state.spec.js`

- [ ] **Step 1: Simplify organizer state**

In `state.js`:
- Remove `organizerToken` from state object
- Remove `getOrganizerToken()`
- Remove localStorage token management
- `setOrganizer(name, email)` — only stores name and email, emits ORGANIZER_SET

- [ ] **Step 2: Update OrganizerForm**

Replace the current form + api-organizer-post flow with the auth gate:
1. Renders auth gate with `showName: true`
2. On success, calls `setOrganizer(name, email)`

- [ ] **Step 3: Update tests**

- [ ] **Step 4: Run full suite, commit**

```bash
git add src/exchange/components/OrganizerForm.js src/exchange/state.js spec/
git commit -m "feat: update OrganizerForm to use auth gate verification flow"
```

---

### Task 24: Update EmailTable and SendResults

**Files:**
- Modify: `src/exchange/components/EmailTable/EmailTable.js` — Remove token from API calls
- Modify: `src/exchange/components/EmailTable/FailedEmails.js` — Remove token from retry
- Modify: `src/exchange/components/EmailTable/SendResults.js` — Remove token from API call
- Update corresponding spec files

- [ ] **Step 1: Update EmailTable.js**

Remove `getOrganizerToken` import. Remove `token` from `api-exchange-post` body — cookie handles auth.

- [ ] **Step 2: Update FailedEmails.js**

Remove `getOrganizerToken` import. Remove `token` from `api-giver-retry-post` body.

- [ ] **Step 3: Update SendResults.js**

Remove `getOrganizerToken` import. Remove `token` from `api-results-email-post` body. Keep `{exchangeId}` only.

- [ ] **Step 4: Update tests, run full suite, commit**

```bash
git add src/exchange/components/EmailTable/ spec/
git commit -m "feat: remove token from EmailTable, FailedEmails, and SendResults API calls"
```

---

### Task 25: Update RecipientSearch and Home Page

**Files:**
- Modify: `src/exchange/components/RecipientSearch.js`
- Modify: `src/exchange/firstScreenTemplates.js`
- Update: `spec/exchange/components/RecipientSearch.spec.js`

- [ ] **Step 1: Update RecipientSearch**

Replace token-based flow with auth gate:
1. Show email input (restore from password type back to email type)
2. On submit, run auth gate flow (email → code → verify)
3. After auth, call `GET api-recipient-get` (cookie auth, no body)
4. Wishlist email button calls `POST api-wishlist-email-post` with `{exchangeId}` only

- [ ] **Step 2: Update firstScreenTemplates.js**

Restore email input type and labels.

- [ ] **Step 3: Update tests, commit**

```bash
git add src/exchange/components/RecipientSearch.js src/exchange/firstScreenTemplates.js spec/
git commit -m "feat: update RecipientSearch to use auth gate with email + verification code"
```

---

### Task 26: Update Reuse Page

**Files:**
- Modify: `src/reuse.js`
- Modify: `pages/reuse/index.html`
- Update: `spec/reuse.spec.js`

- [ ] **Step 1: Update reuse page**

Replace token input with auth gate flow:
1. Show email input (restore from password type)
2. On submit, run auth gate flow
3. After auth, call `GET api-my-exchanges-get` (cookie auth)

- [ ] **Step 2: Update tests, commit**

```bash
git add src/reuse.js pages/reuse/index.html spec/reuse.spec.js
git commit -m "feat: update reuse page to use auth gate with email + verification code"
```

---

### Task 27: Update Wishlist Edit Page with Auth Gate

**Files:**
- Modify: `src/wishlistEdit/index.js`
- Modify: `src/wishlistEdit/components/SaveButton.js`
- Update: `spec/wishlistEdit/index.spec.js`

- [ ] **Step 1: Update index.js**

Replace URL token extraction with auth gate:
1. Check if already authenticated: try `GET api-user-get` — if 200, proceed; if 401, show auth gate
2. If `?user=` in URL (legacy link) → show "This link has expired" message + auth gate
3. After auth, load user data via `GET api-user-get`
4. Remove `history.replaceState` token stripping (no tokens in URL anymore)

- [ ] **Step 2: Update SaveButton.js**

Change `api-user-wishlist-save-post` to `PUT api-user-wishlist-put`. Remove token from body — cookie handles auth. Body becomes `{wishlists, wishItems}` only.

- [ ] **Step 3: Update tests, commit**

```bash
git add src/wishlistEdit/ spec/wishlistEdit/
git commit -m "feat: add auth gate to wishlist edit page, remove URL token handling"
```

---

### Task 28: Update Wishlist View Page with Auth Gate

**Files:**
- Modify: `src/wishlistView.js`
- Update: `spec/wishlistView.spec.js`

- [ ] **Step 1: Update wishlistView.js**

1. Read `exchange` param from URL (keep it — not auth data)
2. If `?user=` in URL (legacy) → show fallback message + auth gate
3. Try `GET api-user-wishlist-get/{exchangeId}` — if 401, show auth gate
4. After auth, retry the GET call
5. Remove `history.replaceState` token stripping

- [ ] **Step 2: Update tests, commit**

```bash
git add src/wishlistView.js spec/wishlistView.spec.js
git commit -m "feat: add auth gate to wishlist view page, remove URL token handling"
```

---

## Phase 6: Cleanup and Documentation

### Task 29: Update Dev REPL

**Files:**
- Modify: `dev/repl.mjs`

- [ ] **Step 1: Update userExchangeData**

- Change `queryOrToken` parameter to `queryOrEmail`
- Accept string as email lookup (was token lookup): `typeof queryOrEmail === "string" ? {email: queryOrEmail} : queryOrEmail`
- Update link construction to use parameterless helpers: `wishlistEditPath()`, `wishlistViewPath(ex.exchangeId)`
- Remove token display from output
- Update help text example

- [ ] **Step 2: Commit**

```bash
git add dev/repl.mjs
git commit -m "chore: update dev REPL to remove token references"
```

---

### Task 30: Update Project Documentation

**Files:**
- Modify: `.claude/CLAUDE.md`
- Modify: `.claude/skills/backend-conventions/SKILL.md`
- Modify: `.claude/skills/backend-testing/SKILL.md`
- Modify: `.claude/skills/frontend-testing/SKILL.md`
- Modify: `.claude/skills/project-map/SKILL.md`

- [ ] **Step 1: Update CLAUDE.md**

Update Architecture section:
- Replace token-based auth description with cookie-based JWT auth
- Document `requireAuth()` middleware pattern
- Update endpoint naming to reflect restored HTTP methods
- Remove references to `getOrganizerToken`, `extractTokenFromPath`, token in localStorage

- [ ] **Step 2: Update backend-conventions skill**

- Document `requireAuth()` integration with `apiHandler`
- Show cookie-based auth pattern for endpoints
- Document `okWithHeaders()` for Set-Cookie responses
- Remove token-related patterns

- [ ] **Step 3: Update backend-testing skill**

- Document how to create auth cookies in tests:
  ```js
  const jwt = await signSession(userId.toString());
  const event = buildEvent("GET", {headers: {cookie: `session=${jwt}`}});
  ```
- Document `authCodes` test patterns

- [ ] **Step 4: Update frontend-testing skill**

- Document auth gate testing patterns
- Document mocking cookie presence/absence

- [ ] **Step 5: Update project-map skill**

- Update file tree with new/renamed/deleted files

- [ ] **Step 6: Commit**

```bash
git add .claude/
git commit -m "docs: update CLAUDE.md and skills for cookie-based JWT auth architecture"
```

---

### Task 31: Update Contract Tests

**Files:**
- Update all files in `spec/integration/`

- [ ] **Step 1: Update contract tests**

All contract tests need:
- Cookie auth instead of token in body
- Updated request/response shapes
- New contract tests for auth endpoints

- [ ] **Step 2: Run full suite, commit**

```bash
git add spec/integration/
git commit -m "test: update all contract tests for cookie-based auth"
```

---

### Task 32: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`

- [ ] **Step 2: Verify no token references remain in production code**

```bash
grep -rn "\.token\|getOrganizerToken\|getUserByToken\|extractTokenFromPath\|organizerToken" netlify/ src/ --include="*.mjs" --include="*.js" | grep -v node_modules | grep -v spec/ | grep -v ".spec."
```
Expected: No matches (except possibly comments or the migration script).

- [ ] **Step 3: Verify no auth data in URLs**

```bash
grep -rn "user=.*token\|?token=\|?user=" netlify/ src/ --include="*.mjs" --include="*.js" | grep -v node_modules | grep -v spec/
```
Expected: No matches.

- [ ] **Step 4: Verify all endpoints use requireAuth or are auth endpoints**

```bash
grep -L "requireAuth\|api-auth\|api-email-preview" netlify/functions/api-*.mjs
```
Expected: Only `api-auth-code-post.mjs`, `api-auth-verify-post.mjs`, `api-auth-logout-post.mjs`, and `api-email-preview-get.mjs`.

- [ ] **Step 5: Verify cookie settings**

```bash
grep -n "Set-Cookie\|buildSessionCookie\|clearSessionCookie" netlify/ -r --include="*.mjs"
```
Verify: HttpOnly, Secure, SameSite=Strict, Path=/, Max-Age=172800.
