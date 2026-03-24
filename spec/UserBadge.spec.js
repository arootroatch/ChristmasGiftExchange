import {describe, it, expect, vi, beforeEach} from "vitest";
import {getSessionUser} from "../src/session.js";

vi.mock("../src/session.js", () => ({
    getSessionUser: vi.fn(() => null),
    clearSession: vi.fn(),
}));

const flush = () => new Promise(r => setTimeout(r, 0));

describe("UserBadge", () => {
    let init, remove;

    beforeEach(async () => {
        vi.resetModules();
        document.getElementById("user-badge")?.remove();
        getSessionUser.mockReturnValue(null);
        globalThis.fetch = vi.fn(() => Promise.resolve({ok: true, status: 200, json: async () => ({success: true})}));

        const mod = await import("../src/UserBadge.js");
        init = mod.init;
        remove = mod.remove;
    });

    it("does nothing when no user is logged in", () => {
        init();
        expect(document.getElementById("user-badge")).toBeNull();
    });

    it("renders badge when user is logged in", () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();

        const badge = document.getElementById("user-badge");
        expect(badge).not.toBeNull();
        expect(badge.textContent).toContain("Alice");
    });

    it("renders a logout link", () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();

        const logoutBtn = document.getElementById("user-badge-logout");
        expect(logoutBtn).not.toBeNull();
    });

    it("calls logout endpoint on click", async () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();

        document.getElementById("user-badge-logout").click();
        await flush();

        expect(fetch).toHaveBeenCalledWith(
            "/.netlify/functions/api-auth-logout-post",
            expect.objectContaining({method: "POST"})
        );
    });

    it("removes badge after logout", async () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();

        document.getElementById("user-badge-logout").click();
        await flush();

        expect(document.getElementById("user-badge")).toBeNull();
    });

    it("calls clearSession after logout", async () => {
        const {clearSession} = await import("../src/session.js");
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();

        document.getElementById("user-badge-logout").click();
        await flush();

        expect(clearSession).toHaveBeenCalled();
    });

    it("remove() removes the badge from DOM", () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();
        expect(document.getElementById("user-badge")).not.toBeNull();

        remove();
        expect(document.getElementById("user-badge")).toBeNull();
    });

    it("does not render duplicate badges on multiple init calls", () => {
        getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
        init();
        init();

        const badges = document.querySelectorAll("#user-badge");
        expect(badges.length).toBe(1);
    });
});
