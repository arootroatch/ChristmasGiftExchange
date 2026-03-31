import {afterEach, describe, it, expect, vi} from 'vitest';
import {z} from "zod";

vi.mock('../../netlify/shared/giverNotification.mjs', () => ({
    sendNotificationEmail: vi.fn(() => Promise.resolve()),
    setRequestOrigin: vi.fn(),
}));

import {apiHandler, validateBody, validateOrigin} from '../../netlify/shared/middleware.mjs';
import {sendNotificationEmail} from '../../netlify/shared/giverNotification.mjs';

describe("apiHandler", () => {
    it("logs the error with stack trace on unhandled exception", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const error = new Error("db exploded");
        const handler = apiHandler("GET", () => { throw error; });
        await handler({httpMethod: "GET"});
        expect(consoleSpy).toHaveBeenCalledWith("Unhandled error in API handler:", error);
        consoleSpy.mockRestore();
    });

    it("returns 500 with error message on unhandled exception", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const handler = apiHandler("GET", () => { throw new Error("db exploded"); });
        const result = await handler({httpMethod: "GET"});
        expect(result.statusCode).toBe(500);
        expect(JSON.parse(result.body).error).toBe("Something went wrong");
        consoleSpy.mockRestore();
    });

    it("sends error notification email on unhandled exception", async () => {
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
        consoleSpy.mockRestore();
    });
});

describe("validateOrigin", () => {
    const originalUrl = process.env.URL;
    const originalDeployUrl = process.env.DEPLOY_PRIME_URL;

    afterEach(() => {
        process.env.URL = originalUrl;
        process.env.DEPLOY_PRIME_URL = originalDeployUrl;
    });

    it("returns null when origin matches URL", () => {
        process.env.URL = "https://gift-exchange-generator.com";
        const event = {headers: {origin: "https://gift-exchange-generator.com"}};
        expect(validateOrigin(event)).toBeNull();
    });

    it("returns 403 when origin doesn't match URL", () => {
        process.env.URL = "https://gift-exchange-generator.com";
        delete process.env.DEPLOY_PRIME_URL;
        const event = {headers: {origin: "https://evil-site.com"}};
        const result = validateOrigin(event);
        expect(result.statusCode).toBe(403);
    });

    it("returns null when origin matches DEPLOY_PRIME_URL", () => {
        process.env.URL = "https://gift-exchange-generator.com";
        process.env.DEPLOY_PRIME_URL = "https://deploy-preview-42--gift-exchange.netlify.app";
        const event = {headers: {origin: "https://deploy-preview-42--gift-exchange.netlify.app"}};
        expect(validateOrigin(event)).toBeNull();
    });

    it("returns null when no origin header is present", () => {
        const event = {headers: {}};
        expect(validateOrigin(event)).toBeNull();
    });

    it("logs the origin and allowed URLs when origin is rejected", () => {
        process.env.URL = "https://gift-exchange-generator.com";
        delete process.env.DEPLOY_PRIME_URL;
        const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
        const event = {headers: {origin: "https://evil-site.com"}};
        validateOrigin(event);
        expect(consoleSpy).toHaveBeenCalledWith(
            "Origin rejected:",
            expect.objectContaining({
                received: "https://evil-site.com",
                allowedUrl: "https://gift-exchange-generator.com",
            })
        );
        consoleSpy.mockRestore();
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
