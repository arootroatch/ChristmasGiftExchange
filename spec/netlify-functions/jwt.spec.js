import {describe, it, expect, beforeAll, afterAll} from "vitest";

describe("jwt", () => {
    let signViewAs, verifyViewAs, buildViewAsCookie, clearViewAsCookie, signSession, verifySession, buildSessionCookie, clearSessionCookie, parseCookies;

    beforeAll(async () => {
        process.env.JWT_SECRET = "test-secret-key-for-jwt";
        const mod = await import("../../netlify/shared/jwt.mjs");
        signViewAs = mod.signViewAs;
        verifyViewAs = mod.verifyViewAs;
        buildViewAsCookie = mod.buildViewAsCookie;
        clearViewAsCookie = mod.clearViewAsCookie;
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

    it("verifyViewAs returns adminId and targetUserId for a viewAs token", async () => {
        const jwt = await signViewAs("a1", "t1");
        expect(await verifyViewAs(jwt)).toMatchObject({adminId: "a1", targetUserId: "t1"});
    });

    it("verifySession rejects a viewAs token", async () => {
        expect(await verifySession(await signViewAs("a", "t"))).toBeNull();
    });

    it("verifyViewAs rejects a session token", async () => {
        expect(await verifyViewAs(await signSession("a"))).toBeNull();
    });

    it("viewAs token expires in 1 hour", async () => {
        const {exp, iat} = await verifyViewAs(await signViewAs("a", "t"));
        expect(exp - iat).toBe(3600);
    });

    it("buildViewAsCookie sets HttpOnly, SameSite=Strict, Path=/, Max-Age=3600", () => {
        const cookie = buildViewAsCookie("tok");
        expect(cookie).toContain("viewAs=tok;");
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("SameSite=Strict");
        expect(cookie).toContain("Path=/");
        expect(cookie).toContain("Max-Age=3600");
    });

    it("clearViewAsCookie sets Max-Age=0", () => {
        const cookie = clearViewAsCookie();
        expect(cookie).toContain("viewAs=;");
        expect(cookie).toContain("Max-Age=0");
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

    it("omits Secure flag in dev context", () => {
        process.env.CONTEXT = "dev";
        const cookie = buildSessionCookie("jwt-token-here");
        const cleared = clearSessionCookie();
        process.env.CONTEXT = "";
        expect(cookie).not.toContain("Secure");
        expect(cleared).not.toContain("Secure");
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
