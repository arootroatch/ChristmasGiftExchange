import {describe, it, expect} from "vitest";
import {
  introTemplate,
  introId,
  dashboardLinkTemplate,
} from "../../src/exchange/firstScreenTemplates";

describe("firstScreenTemplates", () => {
  describe("introTemplate", () => {
    it("returns HTML with the intro id", () => {
      expect(introTemplate()).toContain(`id="${introId}"`);
    });

    it("contains the instructions text", () => {
      expect(introTemplate()).toContain("Drawing names for a gift exchange");
    });

    it("contains Let's go button", () => {
      expect(introTemplate()).toContain('id="letsGo"');
    });

    it("contains Secret Santa button", () => {
      expect(introTemplate()).toContain('id="secretSantaBtn"');
    });

    it("contains the ordered list of steps", () => {
      const html = introTemplate();
      expect(html).toContain("Add all participant names");
      expect(html).toContain("Generate the list");
    });
  });

  describe("dashboardLinkTemplate", () => {
    it("contains a link to /dashboard", () => {
      expect(dashboardLinkTemplate()).toContain('href="/dashboard"');
    });

    it("wraps content in a div with dashboardLink class", () => {
      expect(dashboardLinkTemplate()).toContain('class="dashboardLink"');
    });

    it("contains descriptive text about dashboard features", () => {
      expect(dashboardLinkTemplate().toLowerCase()).toContain("gift");
    });

    it("does not use inline styles on the link", () => {
      expect(dashboardLinkTemplate()).not.toContain('style=');
    });
  });
});
