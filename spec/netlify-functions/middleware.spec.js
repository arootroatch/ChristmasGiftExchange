import {describe, it, expect, vi} from 'vitest';
import {z} from "zod";

vi.mock('../../netlify/shared/giverNotification.mjs', () => ({
    sendNotificationEmail: vi.fn(() => Promise.resolve()),
    setRequestOrigin: vi.fn(),
}));

import {apiHandler, validateBody} from '../../netlify/shared/middleware.mjs';
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
