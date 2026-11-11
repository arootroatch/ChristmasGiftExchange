import {afterAll, afterEach, beforeAll, describe, it, expect, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from '../shared/testData.js';
import {authCookie, viewAsCookie, buildEvent} from '../shared/specHelper.js';
import {z} from "zod";

vi.mock('../../netlify/shared/giverNotification.mjs', () => ({
    sendNotificationEmail: vi.fn(() => Promise.resolve()),
    setRequestOrigin: vi.fn(),
}));

vi.mock('../../netlify/shared/rateLimit.mjs', () => ({
    checkRateLimit: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../netlify/shared/logger.mjs');

import {apiHandler, validateBody, validateOrigin, requestEndpoint} from '../../netlify/shared/middleware.mjs';
import {sendNotificationEmail} from '../../netlify/shared/giverNotification.mjs';
import {checkRateLimit} from '../../netlify/shared/rateLimit.mjs';
import {logger} from '../../netlify/shared/logger.mjs';

describe("apiHandler", () => {
    it("logs the error with stack trace on unhandled exception", async () => {
        const error = new Error("db exploded");
        const handler = apiHandler("GET", () => { throw error; });
        await handler({httpMethod: "GET", path: "/api/test"});
        expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
            "Unhandled error in API handler",
            expect.objectContaining({stack: expect.stringContaining("db exploded")})
        );
    });

    it("returns 500 with error message on unhandled exception", async () => {
        const handler = apiHandler("GET", () => { throw new Error("db exploded"); });
        const result = await handler({httpMethod: "GET"});
        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).error).toBe("Something went wrong");
    });

    it("sends error notification email on unhandled exception", async () => {
        const error = new Error("db exploded");
        const handler = apiHandler("GET", () => { throw error; });
        await handler({httpMethod: "GET", path: "/api/test"});
        expect(sendNotificationEmail).toHaveBeenCalledWith(
            "error-alert",
            "alex@gift-exchange-generator.com",
            "Server Error: db exploded",
            expect.objectContaining({
                endpoint: "GET /api/test",
                stackTrace: expect.stringContaining("db exploded"),
            })
        );
    });

    it("logs warn when rate limit is exceeded", async () => {
        vi.mocked(checkRateLimit).mockResolvedValueOnce({statusCode: 429, body: '{"error":"Too many requests"}'});
        const handler = apiHandler("GET", () => ({}), {maxRequests: 3});
        await handler({httpMethod: "GET", path: "/api/test", headers: {"x-forwarded-for": "1.2.3.4"}});
        expect(vi.mocked(logger.warn)).toHaveBeenCalledWith("Rate limit exceeded", expect.objectContaining({endpoint: "GET /api/test", ip: "1.2.3.4"}));
        vi.mocked(checkRateLimit).mockResolvedValue(null);
    });

    it("attaches ip to event so handlers can read it", async () => {
        let capturedIp;
        const handler = apiHandler("GET", (event) => { capturedIp = event.ip; return {}; });
        await handler({httpMethod: "GET", path: "/api/test", headers: {"x-forwarded-for": "5.6.7.8"}});
        expect(capturedIp).toBe("5.6.7.8");
    });

    it("returns 500 when pre-handler infrastructure throws (e.g. rate limit db error)", async () => {
        vi.mocked(checkRateLimit).mockRejectedValueOnce(new Error("db connection failed"));
        const handler = apiHandler("GET", () => ({}), {maxRequests: 10});
        const result = await handler({httpMethod: "GET", path: "/api/test"});
        expect(result.statusCode).toBe(500);
    });

});

describe("apiHandler admin option", () => {
    let mongo, db, signSession, signViewAs;
    const admin = makeUser({name: "Admin", email: "admin@example.com"});
    const target = makeUser({name: "Target", email: "target@example.com"});
    const regular = makeUser({name: "Regular", email: "regular@example.com"});

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret-key";
        process.env.ADMIN_EMAIL = "admin@example.com";
        ({signSession, signViewAs} = await import("../../netlify/shared/jwt.mjs"));
    });

    afterEach(async () => {
        await cleanCollections(db, "users");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        delete process.env.ADMIN_EMAIL;
        await teardownMongo(mongo);
    });

    it("returns 403 for a non-admin session", async () => {
        await seedUsers(db, regular);
        const handler = apiHandler("GET", () => ({statusCode: 200, body: "{}"}), {admin: true});
        const response = await handler(buildEvent("GET", {headers: {cookie: await authCookie(regular._id)}}));
        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.body).error).toBe("Forbidden");
    });

    it("returns 401 without a session", async () => {
        const handler = apiHandler("GET", () => ({statusCode: 200, body: "{}"}), {admin: true});
        const response = await handler(buildEvent("GET"));
        expect(response.statusCode).toBe(401);
    });

    it("passes the real admin as event.user even when view-as is active", async () => {
        await seedUsers(db, admin, target);
        const session = await signSession(admin._id.toString());
        const viewAs = await signViewAs(admin._id.toString(), target._id.toString());
        let seen;
        const handler = apiHandler("GET", (event) => {
            seen = event.user;
            return {statusCode: 200, body: "{}"};
        }, {admin: true});
        const response = await handler(buildEvent("GET", {headers: {cookie: `session=${session}; viewAs=${viewAs}`}}));
        expect(response.statusCode).toBe(200);
        expect(seen.email).toBe("admin@example.com");
    });

    it("does not pass admin through to the rate limiter", async () => {
        await seedUsers(db, admin);
        const handler = apiHandler("GET", () => ({statusCode: 200, body: "{}"}), {admin: true, maxRequests: 3, windowMs: 1000});
        await handler(buildEvent("GET", {headers: {cookie: await authCookie(admin._id)}}));
        expect(vi.mocked(checkRateLimit).mock.lastCall[2]).not.toHaveProperty("admin");
    });
});

describe("apiHandler read-only enforcement", () => {
    let mongo, db, signViewAs;
    const admin = makeUser({name: "Admin", email: "admin@example.com"});
    const target = makeUser({name: "Target", email: "target@example.com"});
    const regular = makeUser({name: "Regular", email: "regular@example.com"});

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret-key";
        process.env.ADMIN_EMAIL = "admin@example.com";
        ({signViewAs} = await import("../../netlify/shared/jwt.mjs"));
    });

    afterEach(async () => {
        await cleanCollections(db, "users");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        delete process.env.ADMIN_EMAIL;
        await teardownMongo(mongo);
    });

    it("blocks a POST with 403 View-only mode while view-as is active", async () => {
        await seedUsers(db, admin, target);
        const fn = vi.fn();
        const handler = apiHandler("POST", fn, {auth: true});
        const response = await handler(buildEvent("POST", {headers: {cookie: await viewAsCookie(admin._id, target._id)}}));
        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.body).error).toBe("View-only mode");
        expect(fn).not.toHaveBeenCalled();
    });

    it("allows GET while view-as is active", async () => {
        await seedUsers(db, admin, target);
        const fn = vi.fn(() => ({statusCode: 200, body: "{}"}));
        const handler = apiHandler("GET", fn, {auth: true});
        const response = await handler(buildEvent("GET", {headers: {cookie: await viewAsCookie(admin._id, target._id)}}));
        expect(response.statusCode).toBe(200);
        expect(fn).toHaveBeenCalled();
    });

    it("allows POST on an allowDuringViewAs endpoint", async () => {
        await seedUsers(db, admin, target);
        const fn = vi.fn(() => ({statusCode: 200, body: "{}"}));
        const handler = apiHandler("POST", fn, {allowDuringViewAs: true});
        const response = await handler(buildEvent("POST", {headers: {cookie: await viewAsCookie(admin._id, target._id)}}));
        expect(response.statusCode).toBe(200);
        expect(fn).toHaveBeenCalled();
    });

    it("does not pass allowDuringViewAs through to the rate limiter", async () => {
        const handler = apiHandler("POST", () => ({statusCode: 200, body: "{}"}), {allowDuringViewAs: true, maxRequests: 3, windowMs: 1000});
        await handler(buildEvent("POST"));
        expect(vi.mocked(checkRateLimit).mock.lastCall[2]).not.toHaveProperty("allowDuringViewAs");
    });

    it("allows POST on an admin endpoint", async () => {
        await seedUsers(db, admin, target);
        const fn = vi.fn(() => ({statusCode: 200, body: "{}"}));
        const handler = apiHandler("POST", fn, {admin: true});
        const response = await handler(buildEvent("POST", {headers: {cookie: await viewAsCookie(admin._id, target._id)}}));
        expect(response.statusCode).toBe(200);
        expect(fn).toHaveBeenCalled();
    });

    it("does not block a non-admin whose browser has a stale viewAs cookie", async () => {
        await seedUsers(db, admin, target, regular);
        const fn = vi.fn(() => ({statusCode: 200, body: "{}"}));
        const handler = apiHandler("POST", fn, {auth: true});
        const response = await handler(buildEvent("POST", {headers: {cookie: `${await authCookie(regular._id)}; viewAs=${await signViewAs(admin._id.toString(), target._id.toString())}`}}));
        expect(response.statusCode).toBe(200);
        expect(fn).toHaveBeenCalled();
    });
});

describe("requestEndpoint", () => {
    it("combines httpMethod and path", () => {
        expect(requestEndpoint({httpMethod: "POST", path: "/api/test"})).toBe("POST /api/test");
    });
});

describe("validateOrigin", () => {
    const originalUrl = process.env.URL;

    afterEach(() => {
        process.env.URL = originalUrl;
    });

    it("returns null when origin matches production URL", () => {
        const event = {headers: {origin: "https://gift-exchange-generator.com"}};
        expect(validateOrigin(event)).toBeNull();
    });

    it("returns null when origin is a Netlify deploy preview", () => {
        const event = {headers: {origin: "https://69cb37e6cd1cd1b11a51d9eb--giftexchangegenerator.netlify.app"}};
        expect(validateOrigin(event)).toBeNull();
    });

    it("returns null when origin matches process.env.URL", () => {
        process.env.URL = "http://localhost:8888";
        const event = {headers: {origin: "http://localhost:8888"}};
        expect(validateOrigin(event)).toBeNull();
    });

    it("returns 403 when origin doesn't match any allowed pattern", () => {
        delete process.env.URL;
        const event = {headers: {origin: "https://evil-site.com"}};
        const result = validateOrigin(event);
        expect(result.statusCode).toBe(403);
    });

    it("returns null when no origin header is present", () => {
        const event = {headers: {}};
        expect(validateOrigin(event)).toBeNull();
    });

    it("logs the origin when rejected", () => {
        delete process.env.URL;
        const event = {headers: {origin: "https://evil-site.com"}};
        validateOrigin(event);
        expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
            "Origin rejected",
            expect.objectContaining({origin: "https://evil-site.com"})
        );
    });
});

const validateBodySchema = z.object({name: z.string()});

describe("validateBody", () => {
    it("returns error for malformed JSON", () => {
        const event = {body: "not valid json{"};
        const {data, error} = validateBody(validateBodySchema, event);
        expect(data).toBeUndefined();
        expect(error).toBe("Invalid JSON");
    });

    it("returns error for null body", () => {
        const event = {body: null};
        const {data, error} = validateBody(validateBodySchema, event);
        expect(data).toBeUndefined();
        expect(error).toBe("Invalid JSON");
    });

    it("returns parsed data for valid JSON", () => {
        const event = {body: JSON.stringify({name: "test"})};
        const {data, error} = validateBody(validateBodySchema, event);
        expect(error).toBeUndefined();
        expect(data).toEqual({name: "test"});
    });

    it("returns Zod validation error for invalid schema", () => {
        const event = {body: JSON.stringify({name: 123})};
        const {data, error} = validateBody(validateBodySchema, event);
        expect(data).toBeUndefined();
        expect(error).toBeDefined();
    });
});
