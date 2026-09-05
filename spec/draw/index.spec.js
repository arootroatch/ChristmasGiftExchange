import {beforeEach, describe, expect, it, vi} from "vitest";
import {main} from "../../src/draw/index";
import {getState} from "../../src/draw/state";

function stubFetch(ok, body) {
  global.fetch = vi.fn(() => Promise.resolve({
    ok,
    status: ok ? 200 : 404,
    json: () => Promise.resolve(body),
  }));
}

function setUrl(search) {
  Object.defineProperty(window, 'location', {
    value: {search, origin: 'https://test.example'},
    writable: true,
  });
}

describe("draw page main()", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="draw-content"></div>';
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
    const content = document.querySelector("#draw-content");
    expect(content.textContent).toContain("Alex");
    expect(content.textContent).toContain("Whitney");
  });

  it("shows drawn names as disabled", async () => {
    setUrl('?id=abc-123');
    stubFetch(true, {names: [{name: "Alex", hasDrawn: true}]});

    await main();

    const btn = document.querySelector('[data-name="Alex"]');
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain("Already viewed");
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
    document.querySelector('[data-name="Alex"]').click();

    expect(getState().screen).toBe("confirm");
    expect(document.querySelector("#draw-content").textContent).toContain("Alex");
    expect(document.querySelector("#draw-content").textContent).toContain("only do this once");
  });

  it("does not let a quote in a participant name break the button markup", async () => {
    setUrl('?id=abc-123');
    const trickyName = 'Alex "The Great"';
    stubFetch(true, {names: [{name: trickyName, hasDrawn: false}]});

    await main();

    const buttons = document.querySelectorAll("#draw-content button");
    expect(buttons.length).toBe(1);
    expect(buttons[0].dataset.name).toBe(trickyName);
  });
});

describe("draw and reveal", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="draw-content"></div>';
  });

  it("reveals the recipient on successful draw", async () => {
    setUrl('?id=abc-123');
    stubFetch(true, {names: [{name: "Alex", hasDrawn: false}]});
    await main();
    document.querySelector('[data-name="Alex"]').click();

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
    document.querySelector('[data-name="Alex"]').click();

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
    document.querySelector('[data-name="Alex"]').click();

    global.fetch = vi.fn(() => Promise.resolve({
      ok: false, status: 409, json: () => Promise.resolve({error: "Already viewed — ask your organizer"}),
    }));
    document.querySelector("#confirm-draw-btn").click();
    await vi.waitFor(() => expect(getState().screen).toBe("picker"));

    expect(document.querySelector("#draw-content").textContent).toContain("Already viewed");
  });
});
