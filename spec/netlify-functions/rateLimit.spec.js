import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';

describe("rateLimit", () => {
    let client, db, mongo, checkRateLimit;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const mod = await import("../../netlify/shared/rateLimit.mjs");
        checkRateLimit = mod.checkRateLimit;
    });

    afterEach(async () => {
        await cleanCollections(db, "rateLimits");
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it("allows requests under the limit", async () => {
        const result = await checkRateLimit("127.0.0.1", "api-test", {maxRequests: 5, windowMs: 60000});
        expect(result).toBeNull();
    });

    it("returns 429 response when limit exceeded", async () => {
        for (let i = 0; i < 3; i++) {
            await checkRateLimit("127.0.0.1", "api-test", {maxRequests: 3, windowMs: 60000});
        }
        const result = await checkRateLimit("127.0.0.1", "api-test", {maxRequests: 3, windowMs: 60000});
        expect(result).not.toBeNull();
        expect(result.statusCode).toBe(429);
    });

    it("tracks different IPs separately", async () => {
        for (let i = 0; i < 3; i++) {
            await checkRateLimit("127.0.0.1", "api-test", {maxRequests: 3, windowMs: 60000});
        }
        const result = await checkRateLimit("192.168.1.1", "api-test", {maxRequests: 3, windowMs: 60000});
        expect(result).toBeNull();
    });

    it("tracks different endpoints separately", async () => {
        for (let i = 0; i < 3; i++) {
            await checkRateLimit("127.0.0.1", "api-a", {maxRequests: 3, windowMs: 60000});
        }
        const result = await checkRateLimit("127.0.0.1", "api-b", {maxRequests: 3, windowMs: 60000});
        expect(result).toBeNull();
    });

    it("resets after window expires", async () => {
        const col = db.collection("rateLimits");
        await col.insertOne({
            key: "127.0.0.1:api-test",
            endpoint: "api-test",
            count: 10,
            windowStart: new Date(Date.now() - 120000),
        });
        const result = await checkRateLimit("127.0.0.1", "api-test", {maxRequests: 3, windowMs: 60000});
        expect(result).toBeNull();
    });
});
