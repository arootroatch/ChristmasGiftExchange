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

    it("notes that Quick Match can redraw and email the results", () => {
      const card = new DOMParser()
        .parseFromString(introTemplate(), "text/html")
        .querySelector("#letsGo").textContent;
      expect(card).toContain("Draw again as many times as you like");
      expect(card).toContain("(optionally) email the results to yourself or to the participants");
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

    it("orders the cards Names from a Hat, Secret Santa, then Quick Match", () => {
      const cards = new DOMParser()
        .parseFromString(introTemplate(), "text/html")
        .querySelectorAll("button");
      expect([...cards].map((card) => card.id)).toEqual(["namesFromHatBtn", "secretSantaBtn", "letsGo"]);
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
      expect(html.indexOf("modeCardNewBadge")).toBeLessThan(html.indexOf('id="secretSantaBtn"'));
    });

    it("tags each card with the contact info it needs", () => {
      const doc = new DOMParser().parseFromString(introTemplate(), "text/html");
      const tagOn = (id) => doc.querySelector(`#${id} .modeCardTag`).textContent;
      expect(tagOn("namesFromHatBtn")).toBe("No contact or personal info required");
      expect(tagOn("secretSantaBtn")).toBe("Email addresses required");
      expect(tagOn("letsGo")).toBe("No contact or personal info required");
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
      expect(introTemplate()).toContain("your information will never be sold");
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
