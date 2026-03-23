import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";

describe("authCodes", () => {
    let db, mongo, generateAndStoreCode, verifyCode;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret-key-for-hmac";
        const mod = await import("../../netlify/shared/authCodes.mjs");
        generateAndStoreCode = mod.generateAndStoreCode;
        verifyCode = mod.verifyCode;
    });

    afterEach(async () => {
        await cleanCollections(db, "authCodes");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    it("generates an 8-digit numeric code", async () => {
        const code = await generateAndStoreCode("test@test.com");
        expect(code).toMatch(/^\d{8}$/);
    });

    it("stores hashed code in authCodes collection", async () => {
        const code = await generateAndStoreCode("test@test.com");
        const doc = await db.collection("authCodes").findOne({email: "test@test.com"});
        expect(doc).not.toBeNull();
        expect(doc.codeHash).toBeDefined();
        expect(doc.codeHash).not.toBe(code);
        expect(doc.used).toBe(false);
        expect(doc.attempts).toBe(0);
        expect(doc.expiresAt).toBeInstanceOf(Date);
    });

    it("deletes existing codes when generating a new one", async () => {
        await generateAndStoreCode("test@test.com");
        await generateAndStoreCode("test@test.com");
        const count = await db.collection("authCodes").countDocuments({email: "test@test.com"});
        expect(count).toBe(1);
    });

    it("verifies a valid code", async () => {
        const code = await generateAndStoreCode("test@test.com");
        const result = await verifyCode("test@test.com", code);
        expect(result.valid).toBe(true);
    });

    it("marks code as used after verification", async () => {
        const code = await generateAndStoreCode("test@test.com");
        await verifyCode("test@test.com", code);
        const doc = await db.collection("authCodes").findOne({email: "test@test.com"});
        expect(doc.used).toBe(true);
    });

    it("rejects already-used code", async () => {
        const code = await generateAndStoreCode("test@test.com");
        await verifyCode("test@test.com", code);
        const result = await verifyCode("test@test.com", code);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Code already used");
    });

    it("rejects wrong code and increments attempts", async () => {
        await generateAndStoreCode("test@test.com");
        const result = await verifyCode("test@test.com", "00000000");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Invalid code");
        const doc = await db.collection("authCodes").findOne({email: "test@test.com"});
        expect(doc.attempts).toBe(1);
    });

    it("locks after 5 failed attempts", async () => {
        await generateAndStoreCode("test@test.com");
        for (let i = 0; i < 5; i++) {
            await verifyCode("test@test.com", "00000000");
        }
        const result = await verifyCode("test@test.com", "00000000");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Too many attempts. Request a new code.");
    });

    it("rejects code for non-existent email", async () => {
        const result = await verifyCode("nobody@test.com", "12345678");
        expect(result.valid).toBe(false);
    });

    it("rejects expired code", async () => {
        const code = await generateAndStoreCode("test@test.com");
        await db.collection("authCodes").updateOne(
            {email: "test@test.com"},
            {$set: {expiresAt: new Date(Date.now() - 60000)}}
        );
        const result = await verifyCode("test@test.com", code);
        expect(result.valid).toBe(false);
    });
});
