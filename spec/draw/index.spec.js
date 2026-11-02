import {beforeEach, describe, expect, it, vi} from "vitest";
import {main} from "../../src/draw/index";
import {getState} from "../../src/draw/state";
import {getSessionUser, loadSession} from "../../src/session";

vi.mock("../../src/session.js", () => ({
  loadSession: vi.fn(() => Promise.resolve(null)),
  getSessionUser: vi.fn(() => null),
  clearSession: vi.fn(),
}));

const PAGE_HTML = '<div id="container"><div id="draw-content"></div><div id="draw-support"></div></div>';

function stubFetch(ok, body) {
  global.fetch = vi.fn(() => Promise.resolve({
    ok,
    status: ok ? 200 : 404,
    json: () => Promise.resolve(body),
  }));
}

function openPicker() {
  document.querySelector('[role="combobox"]').dispatchEvent(new Event("focus"));
}

function pickName(name) {
  openPicker();
  document.querySelector(`[data-name="${name}"]`).click();
}

function setUrl(search) {
  Object.defineProperty(window, 'location', {
    value: {search, origin: 'https://test.example'},
    writable: true,
  });
}

describe("draw page main()", () => {
  beforeEach(() => {
    document.body.innerHTML = PAGE_HTML;
    localStorage.clear();
    getSessionUser.mockReturnValue(null);
    loadSession.mockResolvedValue(null);
  });

  it("renders the shared navbar", async () => {
    setUrl('');
    await main();

    expect(document.querySelector("#navbar").textContent).toContain("Gift Exchange Generator");
  });

  it("shows the logged-in user in the navbar when there is a session", async () => {
    setUrl('');
    getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
    await main();

    expect(document.querySelector("#navbar").textContent).toContain("Alice");
  });

  it("still renders the navbar when the session fails to load", async () => {
    setUrl('');
    loadSession.mockRejectedValue(new Error("Session load failed"));
    await main();

    expect(document.querySelector("#navbar")).not.toBeNull();
  });

  it("renders the Buy Me a Coffee button outside the swappable card", async () => {
    setUrl('');
    await main();

    expect(document.querySelector("#draw-support #bmc-button-container a").href).toContain("buymeacoffee.com");
  });

  it("asks for cookie consent, which gates the coffee widget", async () => {
    setUrl('');
    await main();

    expect(document.querySelector("#cookie-banner")).not.toBeNull();
    expect(document.querySelector('script[data-name="BMC-Widget"]')).toBeNull();
  });

  it("loads the coffee widget when consent was already given", async () => {
    setUrl('');
    localStorage.setItem("cookie-consent", "accepted");
    await main();

    expect(document.querySelector('script[data-name="BMC-Widget"]')).not.toBeNull();
    document.querySelector('script[data-name="BMC-Widget"]').remove();
  });

  it("shows not-found when there is no id in the URL", async () => {
    setUrl('');
    await main();

    expect(document.querySelector("#draw-content").textContent).toContain("isn't valid");
  });

  it("fetches names and renders the picker when id is present", async () => {
    setUrl('?id=abc-123');
    stubFetch(true, {names: [{name: "Alex", hasDrawn: false}, {name: "Whitney", hasDrawn: true}]});

    await main();

    expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/api-link-exchange-get?exchangeId=abc-123", expect.any(Object));
    openPicker();
    const content = document.querySelector("#draw-content");
    expect(content.textContent).toContain("Alex");
    expect(content.textContent).toContain("Whitney");
  });

  it("shows drawn names as disabled", async () => {
    setUrl('?id=abc-123');
    stubFetch(true, {names: [{name: "Alex", hasDrawn: true}]});

    await main();

    openPicker();
    const option = document.querySelector('[data-name="Alex"]');
    expect(option.getAttribute("aria-disabled")).toBe("true");
    expect(option.textContent).toContain("Already viewed");
  });

  it("shows not-found when the fetch fails", async () => {
    setUrl('?id=bad-id');
    stubFetch(false, {error: "Exchange not found"});

    await main();

    expect(document.querySelector("#draw-content").textContent).toContain("isn't valid");
  });

  it("clicking an undrawn name moves to the confirm screen", async () => {
    setUrl('?id=abc-123');
    stubFetch(true, {names: [{name: "Alex", hasDrawn: false}]});

    await main();
    pickName("Alex");

    expect(getState().screen).toBe("confirm");
    expect(document.querySelector("#draw-content").textContent).toContain("Alex");
    expect(document.querySelector("#draw-content").textContent).toContain("only do this once");
  });

  it("does not let a quote in a participant name break the option markup", async () => {
    setUrl('?id=abc-123');
    const trickyName = 'Alex "The Great"';
    stubFetch(true, {names: [{name: trickyName, hasDrawn: false}]});

    await main();

    openPicker();
    const options = document.querySelectorAll('#draw-content [role="option"]');
    expect(options.length).toBe(1);
    expect(options[0].dataset.name).toBe(trickyName);
  });
});

describe("draw and reveal", () => {
  beforeEach(() => {
    document.body.innerHTML = PAGE_HTML;
    localStorage.clear();
    getSessionUser.mockReturnValue(null);
    loadSession.mockResolvedValue(null);
  });

  it("reveals the recipient on successful draw", async () => {
    setUrl('?id=abc-123');
    stubFetch(true, {names: [{name: "Alex", hasDrawn: false}]});
    await main();
    pickName("Alex");

    global.fetch = vi.fn(() => Promise.resolve({
      ok: true, status: 200, json: () => Promise.resolve({recipient: "Whitney"}),
    }));
    document.querySelector("#confirm-draw-btn").click();
    await vi.waitFor(() => expect(getState().screen).toBe("reveal"));

    expect(document.querySelector("#draw-content").textContent).toContain("Whitney");
  });

  it("posts exchangeId and name to api-link-draw-post", async () => {
    setUrl('?id=abc-123');
    stubFetch(true, {names: [{name: "Alex", hasDrawn: false}]});
    await main();
    pickName("Alex");

    global.fetch = vi.fn(() => Promise.resolve({
      ok: true, status: 200, json: () => Promise.resolve({recipient: "Whitney"}),
    }));
    document.querySelector("#confirm-draw-btn").click();
    await vi.waitFor(() => expect(global.fetch).toHaveBeenCalled());

    expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/api-link-draw-post", expect.objectContaining({method: "POST"}));
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toEqual({exchangeId: "abc-123", name: "Alex"});
  });

  it("returns to picker with an inline error when the draw is lost", async () => {
    setUrl('?id=abc-123');
    stubFetch(true, {names: [{name: "Alex", hasDrawn: false}]});
    await main();
    pickName("Alex");

    global.fetch = vi.fn(() => Promise.resolve({
      ok: false, status: 409, json: () => Promise.resolve({error: "Already viewed — this name has already been drawn"}),
    }));
    document.querySelector("#confirm-draw-btn").click();
    await vi.waitFor(() => expect(getState().screen).toBe("picker"));

    expect(document.querySelector("#draw-content").textContent).toContain("Already viewed");
  });

  it("updates the picker with freshly refetched names when the lost-draw refetch succeeds", async () => {
    setUrl('?id=abc-123');
    stubFetch(true, {names: [{name: "Alex", hasDrawn: false}, {name: "Sam", hasDrawn: false}]});
    await main();
    pickName("Alex");

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: false, status: 409, json: () => Promise.resolve({error: "Already viewed — this name has already been drawn"}),
      })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: () => Promise.resolve({names: [{name: "Alex", hasDrawn: true}, {name: "Sam", hasDrawn: false}]}),
      });
    document.querySelector("#confirm-draw-btn").click();
    await vi.waitFor(() => expect(getState().screen).toBe("picker"));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenNthCalledWith(2, "/.netlify/functions/api-link-exchange-get?exchangeId=abc-123", expect.any(Object));
    expect(getState().names).toEqual([{name: "Alex", hasDrawn: true}, {name: "Sam", hasDrawn: false}]);
    openPicker();
    expect(document.querySelector('[data-name="Alex"]').getAttribute("aria-disabled")).toBe("true");
    expect(document.querySelector('[data-name="Sam"]').getAttribute("aria-disabled")).toBeNull();
  });
});
