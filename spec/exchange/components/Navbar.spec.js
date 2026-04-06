import {describe, it, expect, vi, beforeEach} from "vitest";

vi.mock("../../../src/session.js", () => ({
  getSessionUser: vi.fn(() => null),
  clearSession: vi.fn(),
}));

vi.mock("../../../src/exchange/state.js", () => ({
  ExchangeEvents: {EXCHANGE_STARTED: 'exchange:started'},
  exchangeEvents: {on: vi.fn()},
}));

import {getSessionUser} from "../../../src/session.js";

describe("Navbar", () => {
  let init;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = '<div id="container" class="exchange"><h1 id="exchange-title">Gift Exchange Generator</h1></div>';
    getSessionUser.mockReturnValue(null);
    globalThis.fetch = vi.fn(() => Promise.resolve({ok: true}));

    const mod = await import("../../../src/exchange/components/Navbar.js");
    init = mod.init;
  });

  it("renders navbar with site title link", () => {
    init();

    const navbar = document.getElementById("navbar");
    expect(navbar).not.toBeNull();
    expect(navbar.textContent).toContain("Gift Exchange Generator");
  });

  it("renders favicon image", () => {
    init();

    const img = document.querySelector("#navbar img");
    expect(img).not.toBeNull();
    expect(img.getAttribute("src")).toBe("/favicon-32x32.png");
  });

  it("site title links to home page", () => {
    init();

    const link = document.querySelector("#navbar a");
    expect(link.getAttribute("href")).toBe("/");
  });

  it("does not render user info when not logged in", () => {
    init();

    expect(document.getElementById("navbar-logout")).toBeNull();
  });

  it("renders user name when logged in", () => {
    getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
    init();

    const navbar = document.getElementById("navbar");
    expect(navbar.textContent).toContain("Alice");
  });

  it("renders logout button when logged in", () => {
    getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
    init();

    expect(document.getElementById("navbar-logout")).not.toBeNull();
  });

  it("calls logout endpoint on click", async () => {
    getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
    init();

    document.getElementById("navbar-logout").click();
    await new Promise(r => setTimeout(r, 0));

    expect(fetch).toHaveBeenCalledWith(
      "/.netlify/functions/api-auth-logout-post",
      expect.objectContaining({method: "POST"})
    );
  });

  it("calls clearSession after logout", async () => {
    const {clearSession} = await import("../../../src/session.js");
    getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
    init();

    document.getElementById("navbar-logout").click();
    await new Promise(r => setTimeout(r, 0));

    expect(clearSession).toHaveBeenCalled();
  });

  it("removes navbar after logout", async () => {
    getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
    init();

    document.getElementById("navbar-logout").click();
    await new Promise(r => setTimeout(r, 0));

    expect(document.getElementById("navbar")).toBeNull();
  });

  it("hides h1 when exchange starts", async () => {
    const {exchangeEvents} = await import("../../../src/exchange/state.js");
    init();

    const callback = exchangeEvents.on.mock.calls.find(c => c[0] === "exchange:started")[1];
    callback();

    expect(document.getElementById("exchange-title").hidden).toBe(true);
  });
});
