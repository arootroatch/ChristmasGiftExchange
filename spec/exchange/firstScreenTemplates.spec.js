import {describe, it, expect} from "vitest";
import {
  introTemplate,
  introId,
  recipientSearchTemplate,
  queryDivId,
  reuseLinkTemplate,
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

  describe("recipientSearchTemplate", () => {
    it("wraps content in a div with queryDivId and recipientSearch class", () => {
      const html = recipientSearchTemplate();
      expect(html).toContain(`id="${queryDivId}"`);
      expect(html).toContain('class="recipientSearch"');
    });

    it("returns an empty container div", () => {
      const html = recipientSearchTemplate();
      expect(html).not.toContain("password");
      expect(html).not.toContain("token");
    });
  });

  describe("reuseLinkTemplate", () => {
    it("contains the 'Been here before?' label", () => {
      expect(reuseLinkTemplate()).toContain("Been here before?");
    });

    it("contains a link to /reuse", () => {
      expect(reuseLinkTemplate()).toContain('href="/reuse"');
    });

    it("wraps content in a div with reuseLink class", () => {
      expect(reuseLinkTemplate()).toContain('class="reuseLink"');
    });
  });
});
