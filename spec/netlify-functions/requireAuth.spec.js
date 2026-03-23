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
        process.env.URL = "https://gift-exchange-generator.com";
        const mod = await import("../../netlify/shared/middleware.mjs");
        validateOrigin = mod.validateOrigin;
    });

    afterAll(() => {
        delete process.env.URL;
    });

    it("allows requests with matching origin", () => {
        const event = {headers: {origin: "https://gift-exchange-generator.com"}};
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
