import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {init} from "../src/AnnouncementBanner.js";

const today = new Date(2026, 10, 24);

function initWith(announcement, now = today) {
  init({announcement, now});
}

function banner() {
  return document.getElementById("announcement-banner");
}

describe("AnnouncementBanner", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="container"></div>';
    localStorage.clear();
  });

  afterEach(() => vi.restoreAllMocks());

  it("renders the message when active", () => {
    initWith({message: "Emails fixed", expires: "2026-12-01"});
    expect(document.body.firstElementChild.id).toBe("announcement-banner");
    expect(document.body.firstElementChild.textContent).toContain("Emails fixed");
  });

  it("renders nothing for an empty message", () => {
    initWith({message: "", expires: "2026-12-01"});
    expect(banner()).toBeNull();
  });

  it("renders nothing for a whitespace-only message", () => {
    initWith({message: "  ", expires: "2026-12-01"});
    expect(banner()).toBeNull();
  });

  it("still shows on the expires day", () => {
    initWith({message: "Emails fixed", expires: "2026-12-01"}, new Date(2026, 11, 1, 23, 59));
    expect(banner()).not.toBeNull();
  });

  it("hides after the expires day", () => {
    initWith({message: "Emails fixed", expires: "2026-12-01"}, new Date(2026, 11, 2, 0, 0));
    expect(banner()).toBeNull();
  });

  it("renders nothing when expires is missing or invalid", () => {
    for (const expires of [undefined, "", "12/01/2026", "2026-13-45"]) {
      initWith({message: "Emails fixed", expires});
      expect(banner(), `expires: ${expires}`).toBeNull();
    }
  });

  it("escapes HTML in the message", () => {
    initWith({message: "<img src=x onerror=alert(1)>", expires: "2026-12-01"});
    expect(banner().querySelector("img")).toBeNull();
    expect(banner().textContent).toContain("<img");
  });

  it("dismiss removes the banner and remembers the message", () => {
    initWith({message: "Emails fixed", expires: "2026-12-01"});
    banner().querySelector("button").click();
    expect(banner()).toBeNull();
    expect(localStorage.getItem("dismissedAnnouncement")).toBe("Emails fixed");
  });

  it("does not render a dismissed message", () => {
    localStorage.setItem("dismissedAnnouncement", "Emails fixed");
    initWith({message: "Emails fixed", expires: "2026-12-01"});
    expect(banner()).toBeNull();
  });

  it("renders a new message even if a different one was dismissed", () => {
    localStorage.setItem("dismissedAnnouncement", "old");
    initWith({message: "new", expires: "2026-12-01"});
    expect(banner()).not.toBeNull();
  });

  it("does not render twice", () => {
    initWith({message: "Emails fixed", expires: "2026-12-01"});
    initWith({message: "Emails fixed", expires: "2026-12-01"});
    expect(document.querySelectorAll("#announcement-banner").length).toBe(1);
  });

  it("renders and dismisses when localStorage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => initWith({message: "Emails fixed", expires: "2026-12-01"})).not.toThrow();
    expect(banner()).not.toBeNull();
    expect(() => banner().querySelector("button").click()).not.toThrow();
    expect(banner()).toBeNull();
  });

  it("renders below an existing view-as banner", () => {
    document.body.innerHTML = '<div id="view-as-banner"></div><div id="container"></div>';
    initWith({message: "Emails fixed", expires: "2026-12-01"});
    expect(document.body.firstElementChild.id).toBe("view-as-banner");
    expect(document.body.children[1].id).toBe("announcement-banner");
  });
});
