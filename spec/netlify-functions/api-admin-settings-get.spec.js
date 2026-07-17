import {describe, it, expect, beforeAll, afterAll, afterEach, vi} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from "../shared/testData.js";
import {authCookie, buildEvent} from "../shared/specHelper.js";

vi.mock("../../netlify/shared/logger.mjs", () => ({
    logger: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()},
}));

describe("api-admin-settings-get", () => {
    let db, handler, mongo, setLogLevel, _resetLogLevelCache;

    const adminUser = makeUser({email: "admin@example.com"});
    const regularUser = makeUser({email: "user@example.com"});

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret";
        process.env.ADMIN_EMAIL = "admin@example.com";
        const mod = await import("../../netlify/functions/api-admin-settings-get.mjs");
        handler = mod.handler;
        const settingsMod = await import("../../netlify/shared/settings.mjs");
        setLogLevel = settingsMod.setLogLevel;
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

    it("returns 405 for non-GET requests", async () => {
        await seedUsers(db, adminUser);
        const event = buildEvent("POST", {headers: {cookie: await authCookie(adminUser._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("returns 401 when unauthenticated", async () => {
        const event = buildEvent("GET");
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it("returns 403 when authenticated as non-admin", async () => {
        await seedUsers(db, regularUser);
        const event = buildEvent("GET", {headers: {cookie: await authCookie(regularUser._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(403);
    });

    it("returns the default log level when none is set", async () => {
        await seedUsers(db, adminUser);
        const event = buildEvent("GET", {headers: {cookie: await authCookie(adminUser._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).logLevel).toBe("warn");
    });

    it("returns the configured log level", async () => {
        await seedUsers(db, adminUser);
        await setLogLevel("error");
        const event = buildEvent("GET", {headers: {cookie: await authCookie(adminUser._id)}});
        const response = await handler(event);
        expect(JSON.parse(response.body).logLevel).toBe("error");
    });
});
