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

    it("contains all three mode buttons", () => {
      const html = introTemplate();
      expect(html).toContain('id="letsGo"');
      expect(html).toContain('id="secretSantaBtn"');
      expect(html).toContain('id="namesFromHatBtn"');
    });

    it("labels the Quick Match card", () => {
      expect(introTemplate()).toContain("Quick Match");
    });

    it("labels the Secret Santa card with its full toolkit description", () => {
      const html = introTemplate();
      expect(html).toContain("Secret Santa Mode");
      expect(html).toContain("wishlist");
      expect(html).toContain("lookup page");
    });

    it("labels the Names from a Hat card", () => {
      const html = introTemplate();
      expect(html).toContain("Names from a Hat");
      expect(html).toContain("No emails needed");
    });

    it("keeps the privacy note", () => {
      expect(introTemplate()).toContain("your information will never be shared");
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
