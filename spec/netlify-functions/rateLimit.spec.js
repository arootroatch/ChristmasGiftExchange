import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';

describe("rateLimit", () => {
    let db, mongo, checkRateLimit, checkEmailRateLimit;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        const mod = await import("../../netlify/shared/rateLimit.mjs");
        checkRateLimit = mod.checkRateLimit;
        checkEmailRateLimit = mod.checkEmailRateLimit;
    });

    afterEach(async () => {
        await cleanCollections(db, "rateLimits", "logs");
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

    describe("checkEmailRateLimit", () => {
        const limit = {maxRequests: 2, windowMs: 60000, message: "Too many for this email"};

        async function exhaust(email) {
            for (let i = 0; i < limit.maxRequests; i++) {
                expect(await checkEmailRateLimit(email, "api-test", limit)).toBeNull();
            }
        }

        it("returns 429 with the given message once the limit is exceeded", async () => {
            await exhaust("a@test.com");

            const result = await checkEmailRateLimit("a@test.com", "api-test", limit);

            expect(result.statusCode).toBe(429);
            expect(JSON.parse(result.body).error).toBe("Too many for this email");
        });

        it("tracks different emails separately", async () => {
            await exhaust("a@test.com");

            expect(await checkEmailRateLimit("b@test.com", "api-test", limit)).toBeNull();
        });

        it("treats differently-cased addresses as the same mailbox", async () => {
            await exhaust("a@test.com");

            expect((await checkEmailRateLimit("A@Test.com", "api-test", limit)).statusCode).toBe(429);
        });

        it("does not share a count with IP limits", async () => {
            await exhaust("a@test.com");

            expect(await checkRateLimit("a@test.com", "api-test", limit)).toBeNull();
        });
    });
});
