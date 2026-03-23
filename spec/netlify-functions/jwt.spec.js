import {describe, it, expect, beforeAll, afterAll} from "vitest";

describe("jwt", () => {
    let signSession, verifySession, buildSessionCookie, clearSessionCookie, parseCookies;

    beforeAll(async () => {
        process.env.JWT_SECRET = "test-secret-key-for-jwt";
        const mod = await import("../../netlify/shared/jwt.mjs");
        signSession = mod.signSession;
        verifySession = mod.verifySession;
        buildSessionCookie = mod.buildSessionCookie;
        clearSessionCookie = mod.clearSessionCookie;
        parseCookies = mod.parseCookies;
    });

    afterAll(() => {
        delete process.env.JWT_SECRET;
    });

    it("signs and verifies a JWT", async () => {
        const jwt = await signSession("user-id-123");
        const payload = await verifySession(jwt);
        expect(payload.userId).toBe("user-id-123");
        expect(payload.exp).toBeDefined();
        expect(payload.iat).toBeDefined();
    });

    it("rejects an invalid JWT", async () => {
        const payload = await verifySession("invalid.jwt.token");
        expect(payload).toBeNull();
    });

    it("sets expiry to 48 hours in the future", async () => {
        const jwt = await signSession("user-id-123");
        const payload = await verifySession(jwt);
        const now = Math.floor(Date.now() / 1000);
        const diff = payload.exp - now;
        expect(diff).toBeGreaterThan(172700); // ~48 hours minus a few seconds tolerance
        expect(diff).toBeLessThanOrEqual(172800);
    });

    it("builds a Set-Cookie header string", () => {
        const cookie = buildSessionCookie("jwt-token-here");
        expect(cookie).toContain("session=jwt-token-here");
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("Secure");
        expect(cookie).toContain("SameSite=Strict");
        expect(cookie).toContain("Path=/");
        expect(cookie).toContain("Max-Age=172800");
    });

    it("builds a clearing cookie header", () => {
        const cookie = clearSessionCookie();
        expect(cookie).toContain("session=");
        expect(cookie).toContain("Max-Age=0");
    });

    it("parses cookies from header string", () => {
        const cookies = parseCookies("session=abc123; other=xyz");
        expect(cookies.session).toBe("abc123");
        expect(cookies.other).toBe("xyz");
    });

    it("returns empty object for missing cookie header", () => {
        const cookies = parseCookies(undefined);
        expect(cookies).toEqual({});
    });
});
