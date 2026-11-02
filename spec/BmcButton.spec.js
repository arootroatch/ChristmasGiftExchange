import {beforeEach, describe, expect, it} from "vitest";
import {bmcButtonHtml} from "../src/BmcButton";

describe("bmcButtonHtml", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
  });

  it("links to the Buy Me a Coffee page", () => {
    document.body.innerHTML = bmcButtonHtml();

    const link = document.querySelector("#bmc-button-container a");
    expect(link.getAttribute("href")).toBe("https://buymeacoffee.com/arootroatch");
    expect(link.querySelector("img").getAttribute("alt")).toBe("Buy Me A Coffee");
  });
});
