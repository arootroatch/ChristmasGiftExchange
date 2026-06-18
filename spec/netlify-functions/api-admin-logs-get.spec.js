import {describe, it, expect, beforeAll, afterAll, afterEach, vi} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from "../shared/testData.js";
import {authCookie, buildEvent} from "../shared/specHelper.js";

vi.mock("../../netlify/shared/logger.mjs", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("api-admin-logs-get", () => {
    let db, handler, mongo;

    const adminUser = makeUser({email: "admin@example.com"});
    const regularUser = makeUser({email: "user@example.com"});

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret";
        process.env.ADMIN_EMAIL = "admin@example.com";
        const mod = await import("../../netlify/functions/api-admin-logs-get.mjs");
        handler = mod.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "rateLimits", "logs");
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

    it("returns 200 with empty logs when none exist", async () => {
        await seedUsers(db, adminUser);
        const event = buildEvent("GET", {headers: {cookie: await authCookie(adminUser._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.logs).toEqual([]);
        expect(body.total).toBe(0);
        expect(body.page).toBe(1);
        expect(body.pages).toBe(0);
    });

    it("returns logs within default 24h window", async () => {
        await seedUsers(db, adminUser);
        const col = db.collection("logs");
        await col.insertMany([
            {level: "info", message: "Recent log", endpoint: null, ip: null, metadata: {}, timestamp: new Date()},
            {level: "warn", message: "Old log", endpoint: null, ip: null, metadata: {}, timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000)},
        ]);
        const event = buildEvent("GET", {headers: {cookie: await authCookie(adminUser._id)}});
        const response = await handler(event);
        const body = JSON.parse(response.body);
        expect(body.total).toBe(1);
        expect(body.logs[0].message).toBe("Recent log");
    });

    it("filters by level", async () => {
        await seedUsers(db, adminUser);
        const col = db.collection("logs");
        await col.insertMany([
            {level: "warn", message: "Warning", endpoint: null, ip: null, metadata: {}, timestamp: new Date()},
            {level: "info", message: "Info", endpoint: null, ip: null, metadata: {}, timestamp: new Date()},
        ]);
        const event = buildEvent("GET", {
            headers: {cookie: await authCookie(adminUser._id)},
            queryStringParameters: {level: "warn"},
        });
        const response = await handler(event);
        const body = JSON.parse(response.body);
        expect(body.total).toBe(1);
        expect(body.logs[0].level).toBe("warn");
    });

    it("filters by endpoint substring", async () => {
        await seedUsers(db, adminUser);
        const col = db.collection("logs");
        await col.insertMany([
            {level: "info", message: "Auth request", endpoint: "POST /api/auth-code", ip: null, metadata: {}, timestamp: new Date()},
            {level: "info", message: "User request", endpoint: "GET /api/user", ip: null, metadata: {}, timestamp: new Date()},
        ]);
        const event = buildEvent("GET", {
            headers: {cookie: await authCookie(adminUser._id)},
            queryStringParameters: {endpoint: "auth"},
        });
        const response = await handler(event);
        const body = JSON.parse(response.body);
        expect(body.total).toBe(1);
        expect(body.logs[0].endpoint).toBe("POST /api/auth-code");
    });

    it("paginates results with page size 50", async () => {
        await seedUsers(db, adminUser);
        const col = db.collection("logs");
        const docs = Array.from({length: 60}, (_, i) => ({
            level: "info",
            message: `Log ${i}`,
            endpoint: null,
            ip: null,
            metadata: {},
            timestamp: new Date(Date.now() - i * 1000),
        }));
        await col.insertMany(docs);
        const event = buildEvent("GET", {
            headers: {cookie: await authCookie(adminUser._id)},
            queryStringParameters: {page: "2"},
        });
        const response = await handler(event);
        const body = JSON.parse(response.body);
        expect(body.total).toBe(60);
        expect(body.logs).toHaveLength(10);
        expect(body.page).toBe(2);
        expect(body.pages).toBe(2);
    });
});
