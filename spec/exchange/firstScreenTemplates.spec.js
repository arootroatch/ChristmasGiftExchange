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

    it("lists the Names from a Hat card first", () => {
      const html = introTemplate();
      const hat = html.indexOf('id="namesFromHatBtn"');
      expect(hat).toBeGreaterThan(-1);
      expect(hat).toBeLessThan(html.indexOf('id="letsGo"'));
      expect(hat).toBeLessThan(html.indexOf('id="secretSantaBtn"'));
    });

    it("emphasizes only the Names from a Hat card", () => {
      const html = introTemplate();
      expect(html).toContain('class="modeCard modeCardFeatured" id="namesFromHatBtn"');
      expect(html).toContain('class="modeCard" id="letsGo"');
      expect(html).toContain('class="modeCard" id="secretSantaBtn"');
    });

    it("marks only the Names from a Hat card as new", () => {
      const html = introTemplate();
      expect(html).toContain('<span class="modeCardNewBadge">New</span>');
      expect(html.match(/modeCardNewBadge/g)).toHaveLength(1);
      expect(html.indexOf("modeCardNewBadge")).toBeLessThan(html.indexOf('id="letsGo"'));
    });

    it("tags only the Names from a Hat card as needing no contact or personal info", () => {
      const html = introTemplate();
      expect(html).toContain('<span class="modeCardTag">No contact or personal info required</span>');
      expect(html.match(/modeCardTag/g)).toHaveLength(1);
      expect(html.indexOf("modeCardTag")).toBeLessThan(html.indexOf('id="letsGo"'));
    });

    it("asks how to draw names above the mode cards", () => {
      const html = introTemplate();
      expect(html).toContain('<h2 class="modesHeading">How do you want to draw names?</h2>');
      expect(html.indexOf("modesHeading")).toBeLessThan(html.indexOf('id="namesFromHatBtn"'));
    });

    it("shows an arrow on every mode card, hidden from screen readers", () => {
      const arrows = new DOMParser()
        .parseFromString(introTemplate(), "text/html")
        .querySelectorAll("button .modeCardArrow");
      expect(arrows).toHaveLength(3);
      arrows.forEach((arrow) => expect(arrow.getAttribute("aria-hidden")).toBe("true"));
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
