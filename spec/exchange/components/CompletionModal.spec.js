import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {ExchangeEvents as Events, exchangeEvents as stateEvents, startExchange} from "../../../src/exchange/state";
import {init} from "../../../src/exchange/components/CompletionModal";
import {init as initSnackbar} from "../../../src/Snackbar";

describe("CompletionModal", () => {
  beforeAll(() => {
    initSnackbar();
    init();
  });

  beforeEach(() => {
    startExchange();
    document.querySelector("#completionModal")?.remove();
  });

  describe("success mode", () => {
    it("renders modal on EXCHANGE_COMPLETE", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      const modal = document.querySelector("#completionModal");
      expect(modal).not.toBeNull();
      expect(modal.classList).toContain("sendEmails");
    });

    it("shows thank-you message", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      expect(document.querySelector("#completionModal").textContent).toContain("Thanks for using");
    });

    it("does not show results table", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      expect(document.querySelector("#completionModal .results-card")).toBeNull();
    });

    it("shows Start New Exchange button", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      expect(document.querySelector("#newExchangeBtn")).not.toBeNull();
    });

    it("has a BMC button container", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      expect(document.querySelector("#bmc-button-container")).not.toBeNull();
    });

    it("has no close or dismiss button", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      const modal = document.querySelector("#completionModal");
      expect(modal.querySelector(".close")).toBeNull();
      expect(modal.querySelector("#closeBtn")).toBeNull();
    });
  });

  describe("error mode", () => {
    it("shows error messaging", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "error", assignments: []});

      const modal = document.querySelector("#completionModal");
      expect(modal.textContent).toContain("unable to send");
      expect(modal.textContent).toContain("contact these participants directly");
    });

    it("does not show results table", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "error", assignments: []});

      expect(document.querySelector("#completionModal .results-card")).toBeNull();
    });

    it("shows Start New Exchange button", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "error", assignments: []});

      expect(document.querySelector("#newExchangeBtn")).not.toBeNull();
    });
  });

  describe("results mode", () => {
    const assignments = [
      {giver: "Alex", recipient: "Whitney"},
      {giver: "Whitney", recipient: "Alex"},
    ];

    it("shows results table", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "results", assignments});

      const resultsCard = document.querySelector("#completionModal .results-card");
      expect(resultsCard).not.toBeNull();
      expect(resultsCard.textContent).toContain("Alex");
      expect(resultsCard.textContent).toContain("Whitney");
    });

    it("shows Start New Exchange button", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "results", assignments});

      expect(document.querySelector("#newExchangeBtn")).not.toBeNull();
    });
  });

  describe("defensive behavior", () => {
    it("removes existing modal before rendering new one", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "error", assignments: []});

      const modals = document.querySelectorAll("#completionModal");
      expect(modals.length).toBe(1);
      expect(modals[0].textContent).toContain("unable to send");
    });

    it("removes modal on EXCHANGE_STARTED", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});
      expect(document.querySelector("#completionModal")).not.toBeNull();

      startExchange();

      expect(document.querySelector("#completionModal")).toBeNull();
    });

    it("injects BMC script element into container", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      const script = document.querySelector("#bmc-button-container script");
      expect(script).not.toBeNull();
      expect(script.src).toContain("buymeacoffee.com");
      expect(script.getAttribute("data-slug")).toBe("arootroatch");
    });
  });
});
