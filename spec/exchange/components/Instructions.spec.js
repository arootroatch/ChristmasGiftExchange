import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {
  init as initInstructions,
  render as renderInstructions,
} from "../../../src/exchange/components/Instructions";
import {
  addParticipant,
  assignRecipients,
  startExchange,
  loadExchange,
} from "../../../src/exchange/state";
import {installParticipantNames, resetDOM, resetState} from "../../shared/specHelper";

describe("instructions", () => {
  beforeAll(() => {
    initInstructions();
  });

  beforeEach(() => {
    resetDOM();
    renderInstructions();
  });

  describe("intro rendering", () => {
    it("renders intro content into the instructions slot on init", () => {
      const slot = document.querySelector('[data-slot="instructions"]');
      expect(slot.querySelector("#intro")).not.toBeNull();
      expect(slot.innerHTML).toContain("Drawing names for a gift exchange");
    });

    it("renders Let's go button", () => {
      expect(document.querySelector("#letsGo")).not.toBeNull();
    });

    it("renders Secret Santa button", () => {
      expect(document.querySelector("#secretSantaBtn")).not.toBeNull();
    });

    it("does not mention cookies", () => {
      const slot = document.querySelector('[data-slot="instructions"]');
      expect(slot.innerHTML).not.toContain("cookies");
    });
  });

  describe("exchange started", () => {
    it("removes intro block from DOM after exchange starts", () => {
      startExchange(false);
      expect(document.querySelector("#intro")).toBeNull();
    });

    it("removes intro block from DOM in secret santa mode", () => {
      startExchange(true);
      expect(document.querySelector("#intro")).toBeNull();
    });

    it("clears the instructions slot", () => {
      startExchange(false);
      const slot = document.querySelector('[data-slot="instructions"]');
      expect(slot.innerHTML.trim()).toBe("");
    });
  });

  describe("reuse exchange", () => {
    const exchangeData = {
      isSecretSanta: false,
      houses: [{name: "Group 1", members: ["Alex"]}],
      participants: [{name: "Alex", email: "alex@test.com"}, {name: "Whitney", email: "w@test.com"}]
    };

    it("removes intro block when loading a reused exchange", () => {
      loadExchange(exchangeData);
      expect(document.querySelector("#intro")).toBeNull();
    });

    it("adds secret class to left-container when reusing secret santa exchange", () => {
      loadExchange({...exchangeData, isSecretSanta: true});
      const leftContainer = document.querySelector("#left-container");
      expect(leftContainer.classList.contains("secret")).toBe(true);
    });

    it("does not add secret class when reusing non-secret-santa exchange", () => {
      loadExchange(exchangeData);
      const leftContainer = document.querySelector("#left-container");
      expect(leftContainer.classList.contains("secret")).toBe(false);
    });
  });
});
