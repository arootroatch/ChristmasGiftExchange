import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {
  init as initInstructions,
  render as renderInstructions,
  resetAnimating
} from "../../../src/exchange/components/Instructions";
import {
  addParticipant,
  assignRecipients,
  startExchange,
  loadExchange,
  getState
} from "../../../src/exchange/state";
import {installParticipantNames, resetDOM, resetState} from "../../specHelper";

describe("instructions", () => {
  beforeAll(() => {
    initInstructions();
  });

  beforeEach(() => {
    resetDOM();
    resetAnimating();
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
  });

  describe("exchange started", () => {
    it("shows 'Add Participants' instruction after exchange starts", () => {
      startExchange(false);
      const intro = document.querySelector("#intro");
      expect(intro.textContent).toContain("Add Participants");
    });

    it("shows instruction about unique names", () => {
      startExchange(false);
      const intro = document.querySelector("#intro");
      expect(intro.textContent).toContain("unique");
    });

    it("renders summary and full text for mobile collapsible", () => {
      startExchange(false);
      const summary = document.querySelector(".instruction-summary");
      const full = document.querySelector(".instruction-full");
      expect(summary).not.toBeNull();
      expect(full).not.toBeNull();
    });
  });

  describe("first participant added", () => {
    it("updates to exclusion groups instruction", () => {
      startExchange(false);
      addParticipant("Alex");

      const intro = document.querySelector("#intro");
      expect(intro.textContent).toContain("Exclusion Groups");
    });

    it("mentions Generate List", () => {
      startExchange(false);
      addParticipant("Alex");

      const intro = document.querySelector("#intro");
      expect(intro.textContent).toContain("Generate List");
    });

    it("does not update on subsequent participant adds", () => {
      startExchange(false);
      addParticipant("Alex");
      const firstContent = document.querySelector("#intro").innerHTML;

      addParticipant("Whitney");
      expect(document.querySelector("#intro").innerHTML).toBe(firstContent);
    });
  });

  describe("recipients assigned", () => {
    it("updates to results instruction", () => {
      startExchange(false);
      addParticipant("Alex");
      installParticipantNames("Whitney");
      assignRecipients(["Whitney", "Alex"]);

      const intro = document.querySelector("#intro");
      expect(intro.textContent).toContain("Results");
    });

    it("mentions Email Results for non-secret-santa", () => {
      startExchange(false);
      addParticipant("Alex");
      installParticipantNames("Whitney");
      assignRecipients(["Whitney", "Alex"]);

      const intro = document.querySelector("#intro");
      expect(intro.textContent).toContain("Email Results");
    });

    it("shows secret santa specific text in secret santa mode", () => {
      startExchange(true);
      addParticipant("Alex");
      installParticipantNames("Whitney");
      assignRecipients(["Whitney", "Alex"]);

      const intro = document.querySelector("#intro");
      expect(intro.textContent).toContain("Secret Santa");
      expect(intro.textContent).not.toContain("Email Results");
    });
  });

  describe("mobile collapsible", () => {
    it("toggles collapsed/expanded on click", () => {
      startExchange(false);
      const intro = document.querySelector("#intro");

      expect(intro.classList.contains("instruction-collapsed")).toBe(true);

      intro.click();
      expect(intro.classList.contains("instruction-expanded")).toBe(true);
      expect(intro.classList.contains("instruction-collapsed")).toBe(false);

      intro.click();
      expect(intro.classList.contains("instruction-collapsed")).toBe(true);
      expect(intro.classList.contains("instruction-expanded")).toBe(false);
    });
  });

  describe("reuse exchange instructions", () => {
    const exchangeData = {
      isSecretSanta: false,
      houses: [{name: "Group 1", members: ["Alex"]}],
      participants: [{name: "Alex", email: "alex@test.com"}, {name: "Whitney", email: "w@test.com"}]
    };

    it("shows welcome back message when loading a reused exchange", () => {
      loadExchange(exchangeData);

      const intro = document.querySelector("#intro p, #intro .instruction-full");
      expect(intro.textContent).toContain("Welcome back!");
    });

    it("shows instructions to modify exchange and generate", () => {
      loadExchange(exchangeData);

      const intro = document.querySelector("#intro");
      expect(intro.textContent).toContain("Generate List");
    });

    it("adds secret class to left-container when reusing secret santa exchange", () => {
      const secretExchangeData = {
        ...exchangeData,
        isSecretSanta: true,
      };

      loadExchange(secretExchangeData);

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
