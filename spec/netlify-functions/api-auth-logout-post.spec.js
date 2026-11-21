import {describe, it, expect, beforeAll} from "vitest";
import {buildEvent} from "../shared/specHelper.js";

describe("api-auth-logout-post", () => {
    let handler;

    beforeAll(async () => {
        const mod = await import("../../netlify/functions/api-auth-logout-post.mjs");
        handler = mod.handler;
    });

    it("rejects non-POST requests", async () => {
        const event = buildEvent("GET");
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("returns 200 with Set-Cookie that clears session", async () => {
        const event = buildEvent("POST", {
            headers: {origin: "https://gift-exchange-generator.com"},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(200);
        const cookies = response.multiValueHeaders["Set-Cookie"];
        expect(cookies.find(c => c.startsWith("session=;"))).toContain("Max-Age=0");
    });

    it("clears both session and viewAs cookies", async () => {
        const event = buildEvent("POST", {
            headers: {origin: "https://gift-exchange-generator.com"},
        });
        const response = await handler(event);
        const cookies = response.multiValueHeaders["Set-Cookie"];
        expect(cookies).toHaveLength(2);
        expect(cookies.find(c => c.startsWith("session=;"))).toContain("Max-Age=0");
        expect(cookies.find(c => c.startsWith("viewAs=;"))).toContain("Max-Age=0");
    });

    it("returns success body", async () => {
        const event = buildEvent("POST", {
            headers: {origin: "https://gift-exchange-generator.com"},
        });
        const response = await handler(event);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
    });
});
