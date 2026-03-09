import {describe, it, expect, vi} from 'vitest';

vi.mock('../../netlify/shared/giverNotification.mjs', () => ({
    sendNotificationEmail: vi.fn(() => Promise.resolve()),
}));

import {apiHandler} from '../../netlify/shared/middleware.mjs';
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
            "alex@soundrootsproductions.com",
            "Server Error: db exploded",
            expect.objectContaining({
                endpoint: "GET /api/test",
                stackTrace: expect.stringContaining("db exploded"),
            })
        );
        consoleSpy.mockRestore();
    });
});
