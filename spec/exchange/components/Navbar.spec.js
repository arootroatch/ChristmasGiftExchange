import {describe, it, expect, vi, beforeEach} from "vitest";

vi.mock("../../../src/session.js", () => ({
  getSessionUser: vi.fn(() => null),
  clearSession: vi.fn(),
}));

vi.mock("../../../src/exchange/state.js", () => ({
  ExchangeEvents: {EXCHANGE_STARTED: 'exchange:started'},
  exchangeEvents: {on: vi.fn()},
}));

describe("exchange Navbar", () => {
  let init;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = '<div id="container" class="exchange"><h1 id="exchange-title">Gift Exchange Generator</h1></div>';
    const mod = await import("../../../src/exchange/components/Navbar.js");
    init = mod.init;
  });

  it("renders the shared navbar", () => {
    init();

    expect(document.getElementById("navbar")).not.toBeNull();
  });

  it("hides h1 when exchange starts", async () => {
    const {exchangeEvents} = await import("../../../src/exchange/state.js");
    init();

    const callback = exchangeEvents.on.mock.calls.find(c => c[0] === "exchange:started")[1];
    callback();

    expect(document.getElementById("exchange-title").hidden).toBe(true);
  });
});
