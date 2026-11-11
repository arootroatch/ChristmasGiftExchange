import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";

vi.mock("../src/session.js", () => ({
  getViewingAs: vi.fn(() => null),
}));

import {getViewingAs} from "../src/session.js";
import {init} from "../src/ViewAsBanner.js";

describe("ViewAsBanner", () => {
  let locationMock;

  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    getViewingAs.mockReturnValue(null);
    locationMock = {href: ""};
    const realWindow = window;
    vi.stubGlobal("window", new Proxy(realWindow, {
      get: (target, prop) => prop === "location" ? locationMock : Reflect.get(target, prop),
    }));
    globalThis.fetch = vi.fn(() => Promise.resolve({ok: true}));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("renders nothing when not viewing as", () => {
    init();
    expect(document.body.children.length).toBe(1);
  });

  it("renders Viewing as Jane (jane@x.com) — read-only", () => {
    getViewingAs.mockReturnValue({name: "Jane", email: "jane@x.com"});
    init();
    const banner = document.body.firstElementChild;
    expect(banner.id).toBe("view-as-banner");
    expect(banner.textContent).toContain("Viewing as Jane (jane@x.com) — read-only");
    expect(banner.querySelector("button").textContent).toBe("Exit");
  });

  it("Exit calls the delete endpoint and navigates to /admin/users", async () => {
    getViewingAs.mockReturnValue({name: "Jane", email: "jane@x.com"});
    init();
    document.querySelector("#view-as-banner button").click();
    await vi.waitFor(() => expect(locationMock.href).toBe("/admin/users"));
    expect(globalThis.fetch).toHaveBeenCalledWith("/.netlify/functions/api-admin-view-as-delete", {method: "DELETE"});
  });

  it("escapes the name", () => {
    getViewingAs.mockReturnValue({name: "<img src=x>", email: "a@x.com"});
    init();
    const banner = document.getElementById("view-as-banner");
    expect(banner.querySelector("img")).toBeNull();
    expect(banner.textContent).toContain("<img src=x>");
  });
});
