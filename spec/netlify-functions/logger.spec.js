import {describe, it, expect, beforeAll, afterAll, afterEach, vi} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';

describe("logger", () => {
    let db, mongo, logger;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        const mod = await import("../../netlify/shared/logger.mjs");
        logger = mod.logger;
    });

    afterEach(async () => {
        await cleanCollections(db, "logs");
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it("writes a warn log to the logs collection", async () => {
        await logger.warn("Rate limit exceeded", {endpoint: "/api/auth-code", ip: "1.2.3.4", count: 4});
        const doc = await db.collection("logs").findOne({message: "Rate limit exceeded"});
        expect(doc).not.toBeNull();
        expect(doc.level).toBe("warn");
        expect(doc.endpoint).toBe("/api/auth-code");
        expect(doc.ip).toBe("1.2.3.4");
        expect(doc.metadata).toEqual({count: 4});
        expect(doc.timestamp).toBeInstanceOf(Date);
    });

    it("writes an info log with no context", async () => {
        await logger.info("Request received");
        const doc = await db.collection("logs").findOne({message: "Request received"});
        expect(doc).not.toBeNull();
        expect(doc.level).toBe("info");
        expect(doc.endpoint).toBeNull();
        expect(doc.ip).toBeNull();
        expect(doc.metadata).toEqual({});
    });

    it("writes an error log", async () => {
        await logger.error("Unhandled error", {endpoint: "POST /api/test", stack: "Error: boom"});
        const doc = await db.collection("logs").findOne({message: "Unhandled error"});
        expect(doc).not.toBeNull();
        expect(doc.level).toBe("error");
        expect(doc.metadata).toEqual({stack: "Error: boom"});
    });

    it("calls console.warn for warn level", async () => {
        const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
        await logger.warn("Origin rejected", {origin: "https://evil.com"});
        expect(spy).toHaveBeenCalledWith("Origin rejected", expect.objectContaining({origin: "https://evil.com"}));
        spy.mockRestore();
    });

    it("calls console.log for info level", async () => {
        // console.log is already mocked by setupMongo
        await logger.info("Request received");
        expect(mongo.consoleLogSpy).toHaveBeenCalledWith("Request received", undefined);
    });

    it("calls console.error for error level", async () => {
        // console.error is already mocked by setupMongo
        await logger.error("Something broke");
        expect(mongo.consoleErrorSpy).toHaveBeenCalledWith("Something broke", undefined);
    });

    it("does not throw when DB write fails", async () => {
        // Force a DB error by temporarily breaking the collection
        const mod = await import("../../netlify/shared/db.mjs");
        const original = mod.getLogsCollection;
        vi.spyOn(mod, 'getLogsCollection').mockRejectedValueOnce(new Error("DB unavailable"));
        await expect(logger.warn("Should not throw")).resolves.not.toThrow();
        vi.restoreAllMocks();
    });
});
