import {describe, it, expect, beforeAll, afterAll, afterEach, vi} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';

describe("settings", () => {
    let db, mongo, getLogLevel, setLogLevel, _resetLogLevelCache;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        const mod = await import("../../netlify/shared/settings.mjs");
        getLogLevel = mod.getLogLevel;
        setLogLevel = mod.setLogLevel;
        _resetLogLevelCache = mod._resetLogLevelCache;
    });

    afterEach(async () => {
        _resetLogLevelCache();
        await cleanCollections(db, "settings");
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it("defaults to warn when no settings document exists", async () => {
        expect(await getLogLevel()).toBe("warn");
    });

    it("returns the stored level after setLogLevel", async () => {
        await setLogLevel("error");
        expect(await getLogLevel()).toBe("error");
    });

    it("persists the level to the settings collection", async () => {
        await setLogLevel("debug");
        const doc = await db.collection("settings").findOne({_id: "global"});
        expect(doc.logLevel).toBe("debug");
    });

    it("caches the level for subsequent reads instead of hitting the db every time", async () => {
        await setLogLevel("error");
        await db.collection("settings").updateOne({_id: "global"}, {$set: {logLevel: "debug"}});
        expect(await getLogLevel()).toBe("error");
    });

    it("clears the cache when setLogLevel is called", async () => {
        await setLogLevel("error");
        await getLogLevel();
        await setLogLevel("debug");
        expect(await getLogLevel()).toBe("debug");
    });

    it("fails open to debug when the settings lookup throws", async () => {
        const dbMod = await import("../../netlify/shared/db.mjs");
        const spy = vi.spyOn(dbMod, "getSettingsCollection").mockRejectedValueOnce(new Error("DB down"));
        expect(await getLogLevel()).toBe("debug");
        spy.mockRestore();
    });
});
