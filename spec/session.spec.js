import {describe, it, expect, vi, beforeEach} from "vitest";

describe("session", () => {
  let loadSession, getSessionUser, setSessionUser, clearSession;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("../src/session.js");
    loadSession = mod.loadSession;
    getSessionUser = mod.getSessionUser;
    setSessionUser = mod.setSessionUser;
    clearSession = mod.clearSession;
  });

  describe("loadSession", () => {
    it("returns full response data and caches name/email", async () => {
      globalThis.fetch = vi.fn(() => Promise.resolve({
        ok: true, status: 200,
        json: async () => ({name: "Alice", email: "alice@test.com", wishlists: [], wishItems: [], currency: "USD"}),
      }));

      const data = await loadSession();

      expect(data).toEqual({name: "Alice", email: "alice@test.com", wishlists: [], wishItems: [], currency: "USD"});
      expect(getSessionUser()).toEqual({name: "Alice", email: "alice@test.com"});
      expect(fetch).toHaveBeenCalledWith("/.netlify/functions/api-user-get", {method: "GET"});
    });

    it("returns null on 401", async () => {
      globalThis.fetch = vi.fn(() => Promise.resolve({
        ok: false, status: 401,
        json: async () => ({error: "Unauthorized"}),
      }));

      const data = await loadSession();

      expect(data).toBeNull();
      expect(getSessionUser()).toBeNull();
    });

    it("throws on non-401 error", async () => {
      globalThis.fetch = vi.fn(() => Promise.resolve({
        ok: false, status: 500,
        json: async () => ({}),
      }));

      await expect(loadSession()).rejects.toThrow("Session load failed");
      expect(getSessionUser()).toBeNull();
    });

    it("throws on fetch error", async () => {
      globalThis.fetch = vi.fn(() => Promise.reject(new Error("network")));

      await expect(loadSession()).rejects.toThrow("network");
      expect(getSessionUser()).toBeNull();
    });
  });

  describe("getSessionUser", () => {
    it("returns null before loadSession is called", () => {
      expect(getSessionUser()).toBeNull();
    });

    it("returns cached user after loadSession", async () => {
      globalThis.fetch = vi.fn(() => Promise.resolve({
        ok: true, status: 200,
        json: async () => ({name: "Alice", email: "alice@test.com"}),
      }));

      await loadSession();

      expect(getSessionUser()).toEqual({name: "Alice", email: "alice@test.com"});
    });
  });

  describe("setSessionUser", () => {
    it("sets user accessible via getSessionUser", () => {
      setSessionUser({name: "Bob", email: "bob@test.com"});

      expect(getSessionUser()).toEqual({name: "Bob", email: "bob@test.com"});
    });
  });

  describe("clearSession", () => {
    it("clears cached user", () => {
      setSessionUser({name: "Bob", email: "bob@test.com"});
      clearSession();

      expect(getSessionUser()).toBeNull();
    });
  });
});
