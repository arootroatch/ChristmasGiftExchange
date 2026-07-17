import {describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';

describe("logger", () => {
    let db, mongo, logger, setLogLevel;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        const mod = await import("../../netlify/shared/logger.mjs");
        logger = mod.logger;
        const settingsMod = await import("../../netlify/shared/settings.mjs");
        setLogLevel = settingsMod.setLogLevel;
    });

    beforeEach(async () => {
        await setLogLevel("debug");
    });

    afterEach(async () => {
        await cleanCollections(db, "logs", "settings");
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
        expect(mongo.consoleLogSpy).toHaveBeenCalledWith("Request received");
    });

    it("calls console.error for error level", async () => {
        // console.error is already mocked by setupMongo
        await logger.error("Something broke");
        expect(mongo.consoleErrorSpy).toHaveBeenCalledWith("Something broke");
    });

    it("does not throw when DB write fails", async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const mod = await import("../../netlify/shared/db.mjs");
        const spy = vi.spyOn(mod, 'getLogsCollection').mockRejectedValueOnce(new Error("DB unavailable"));
        await expect(logger.warn("Should not throw")).resolves.not.toThrow();
        spy.mockRestore();
        warnSpy.mockRestore();
    });

    it("skips console output and db insert when level is below threshold", async () => {
        await setLogLevel("warn");
        const spy = vi.spyOn(console, "log").mockImplementation(() => {});
        await logger.info("Should be suppressed");
        expect(spy).not.toHaveBeenCalled();
        const doc = await db.collection("logs").findOne({message: "Should be suppressed"});
        expect(doc).toBeNull();
        spy.mockRestore();
    });

    it("logs when level is at or above threshold", async () => {
        await setLogLevel("warn");
        await logger.warn("Should be logged");
        const doc = await db.collection("logs").findOne({message: "Should be logged"});
        expect(doc).not.toBeNull();
    });

    it("fails open (logs everything) when settings lookup fails", async () => {
        const dbMod = await import("../../netlify/shared/db.mjs");
        const spy = vi.spyOn(dbMod, "getSettingsCollection").mockRejectedValueOnce(new Error("DB down"));
        await logger.info("Should still log");
        const doc = await db.collection("logs").findOne({message: "Should still log"});
        expect(doc).not.toBeNull();
        spy.mockRestore();
    });
});
