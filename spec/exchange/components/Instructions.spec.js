import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {init as initInstructions, render as renderInstructions, resetAnimating} from "../../../src/exchange/components/Instructions";
import {loadExchange, nextStep} from "../../../src/exchange/state";
import {resetDOM, resetState} from "../../specHelper";

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

  describe("step instructions", () => {
    it("renders Step 1 after exchange starts", () => {
      resetState();
      const intro = document.querySelector("#intro");
      expect(intro.innerHTML).toContain("Step 1 / 4");
    });

    it("applies slide-in-right class on first render", () => {
      resetState();
      const p = document.querySelector("#intro p");
      expect(p.classList.contains("slide-in-right")).toBe(true);
    });

    it("updates content on NEXT_STEP after animationend", () => {
      resetState();
      nextStep(3);

      const oldP = document.querySelector("#intro p");
      expect(oldP.classList.contains("slide-out-left")).toBe(true);
      expect(oldP.textContent).toContain("Step 1 / 4");

      oldP.dispatchEvent(new Event("animationend"));

      const newP = document.querySelector("#intro p");
      expect(newP.innerHTML).toContain("Step 2 / 4");
      expect(newP.classList.contains("slide-in-right")).toBe(true);
    });

    it("drops rapid clicks while animating", () => {
      resetState();
      nextStep(3);

      const oldP = document.querySelector("#intro p");
      nextStep(3);

      expect(oldP.classList.contains("slide-out-left")).toBe(true);
      expect(oldP.textContent).toContain("Step 1 / 4");

      oldP.dispatchEvent(new Event("animationend"));

      const newP = document.querySelector("#intro p");
      expect(newP.innerHTML).toContain("Step 2 / 4");
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

      const intro = document.querySelector("#intro p");
      expect(intro.textContent).toContain("Welcome back!");
    });

    it("shows instructions to modify exchange and generate", () => {
      loadExchange(exchangeData);

      const intro = document.querySelector("#intro p");
      expect(intro.textContent).toContain("Generate List");
    });

    it("does not show step 1 instructions", () => {
      loadExchange(exchangeData);

      const intro = document.querySelector("#intro p");
      expect(intro.textContent).not.toContain("Step 1");
    });
  });
});
