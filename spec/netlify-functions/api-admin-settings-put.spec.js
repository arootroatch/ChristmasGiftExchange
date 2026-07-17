import {describe, it, expect, beforeAll, afterAll, afterEach, vi} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from "../shared/testData.js";
import {authCookie, buildEvent} from "../shared/specHelper.js";

vi.mock("../../netlify/shared/logger.mjs", () => ({
    logger: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()},
}));

describe("api-admin-settings-put", () => {
    let db, handler, mongo, _resetLogLevelCache;

    const adminUser = makeUser({email: "admin@example.com"});
    const regularUser = makeUser({email: "user@example.com"});

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret";
        process.env.ADMIN_EMAIL = "admin@example.com";
        const mod = await import("../../netlify/functions/api-admin-settings-put.mjs");
        handler = mod.handler;
        const settingsMod = await import("../../netlify/shared/settings.mjs");
        _resetLogLevelCache = settingsMod._resetLogLevelCache;
    });

    afterEach(async () => {
        _resetLogLevelCache();
        await cleanCollections(db, "users", "settings");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        delete process.env.ADMIN_EMAIL;
        await teardownMongo(mongo);
    });

    it("returns 405 for non-PUT requests", async () => {
        await seedUsers(db, adminUser);
        const event = buildEvent("GET", {headers: {cookie: await authCookie(adminUser._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("returns 401 when unauthenticated", async () => {
        const event = buildEvent("PUT", {body: {logLevel: "error"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it("returns 403 when authenticated as non-admin", async () => {
        await seedUsers(db, regularUser);
        const event = buildEvent("PUT", {
            headers: {cookie: await authCookie(regularUser._id)},
            body: {logLevel: "error"},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(403);
    });

    it("returns 400 for an invalid logLevel", async () => {
        await seedUsers(db, adminUser);
        const event = buildEvent("PUT", {
            headers: {cookie: await authCookie(adminUser._id)},
            body: {logLevel: "verbose"},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it("updates the log level and returns it", async () => {
        await seedUsers(db, adminUser);
        const event = buildEvent("PUT", {
            headers: {cookie: await authCookie(adminUser._id)},
            body: {logLevel: "error"},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).logLevel).toBe("error");
        const doc = await db.collection("settings").findOne({_id: "global"});
        expect(doc.logLevel).toBe("error");
    });
});
