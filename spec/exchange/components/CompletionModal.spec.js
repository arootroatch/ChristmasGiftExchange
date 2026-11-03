import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {ExchangeEvents as Events, exchangeEvents as stateEvents, startExchange} from "../../../src/exchange/state";
import {init} from "../../../src/exchange/components/CompletionModal";
import {init as initSnackbar} from "../../../src/Snackbar";
import confirmStyles from '../../../assets/styles/exchange/components/email-confirmation.module.css';
import {tableStyles} from "../../../src/exchange/components/ResultsTable";
import {shouldDisplayErrorSnackbar} from "../../shared/specHelper";

describe("CompletionModal", () => {
  beforeAll(() => {
    initSnackbar();
    init();
  });

  beforeEach(() => {
    localStorage.clear();
    startExchange();
    document.querySelector("#completionModal")?.remove();
  });

  describe("success mode", () => {
    it("renders modal on EXCHANGE_COMPLETE", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      const modal = document.querySelector("#completionModal");
      expect(modal).not.toBeNull();
      expect(modal.classList).toContain(confirmStyles.sendEmails);
    });

    it("shows success message with save confirmation", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      const text = document.querySelector("#completionModal").textContent;
      expect(text).toContain("saved and emails have been sent");
      expect(text).toContain("Thanks for using");
    });

    it("does not show results table", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      expect(document.querySelector(`#completionModal .${tableStyles.resultsCard}`)).toBeNull();
    });

    it("shows Start New Exchange button", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      expect(document.querySelector("#newExchangeBtn")).not.toBeNull();
    });

    it("has a BMC button container", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      expect(document.querySelector("#bmc-button-container")).not.toBeNull();
    });

    it("shows hint about floating widget when BMC is consented", () => {
      localStorage.setItem("cookie-consent", "accepted");
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      expect(document.querySelector("#completionModal").textContent).toContain("coffee cup in the bottom right");
    });

    it("does not show hint about floating widget when BMC is not consented", () => {
      localStorage.removeItem("cookie-consent");
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      expect(document.querySelector("#completionModal").textContent).not.toContain("coffee cup in the bottom right");
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

      expect(document.querySelector(`#completionModal .${tableStyles.resultsCard}`)).toBeNull();
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

      const resultsCard = document.querySelector(`#completionModal .${tableStyles.resultsCard}`);
      expect(resultsCard).not.toBeNull();
      expect(resultsCard.textContent).toContain("Alex");
      expect(resultsCard.textContent).toContain("Whitney");
    });

    it("shows Start New Exchange button", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "results", assignments});

      expect(document.querySelector("#newExchangeBtn")).not.toBeNull();
    });
  });

  describe("link mode", () => {
    it("shows the draw page URL", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "link", exchangeId: "abc-123", assignments: []});

      const modal = document.querySelector("#completionModal");
      const input = modal.querySelector("#linkExchangeUrl");
      expect(input).not.toBeNull();
      expect(input.value).toContain("/draw?id=abc-123");
    });

    it("shows an icon-only copy button with an accessible label", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "link", exchangeId: "abc-123", assignments: []});

      const button = document.querySelector("#copyLinkBtn");
      expect(button.querySelector("svg")).not.toBeNull();
      expect(button.getAttribute("aria-label")).toBe("Copy link");
      expect(button.textContent.trim()).toBe("");
    });

    function stubClipboard(writeText = vi.fn().mockResolvedValue()) {
      Object.defineProperty(navigator, "clipboard", {value: {writeText}, configurable: true});
      return writeText;
    }

    function renderLinkModal() {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "link", exchangeId: "abc-123", assignments: []});
      return document.querySelector("#linkExchangeUrl");
    }

    it("copies the link when the link field is clicked", () => {
      const writeText = stubClipboard();
      const input = renderLinkModal();

      input.click();

      expect(writeText).toHaveBeenCalledWith(input.value);
    });

    it("copies the link when the icon button is clicked", () => {
      const writeText = stubClipboard();
      const input = renderLinkModal();

      document.querySelector("#copyLinkBtn").click();

      expect(writeText).toHaveBeenCalledWith(input.value);
    });

    it("confirms on the icon button when the link has been copied", async () => {
      stubClipboard();
      renderLinkModal().click();

      const button = document.querySelector("#copyLinkBtn");
      await vi.waitFor(() => expect(button.getAttribute("aria-label")).toBe("Link copied"));
      expect(button.querySelector("[data-icon='check']")).not.toBeNull();
    });

    it("announces in text that the link was copied", async () => {
      stubClipboard();
      renderLinkModal().click();

      const message = document.querySelector("#linkCopiedMsg");
      await vi.waitFor(() => expect(message.textContent).toBe("Link copied to clipboard!"));
      expect(message.getAttribute("role")).toBe("status");
    });

    it("restores the copy icon and clears the message after a moment", async () => {
      vi.useFakeTimers();
      try {
        stubClipboard();
        renderLinkModal().click();
        await vi.advanceTimersByTimeAsync(2999);
        expect(document.querySelector("#linkCopiedMsg").textContent).not.toBe("");
        await vi.advanceTimersByTimeAsync(1);

        const button = document.querySelector("#copyLinkBtn");
        expect(button.getAttribute("aria-label")).toBe("Copy link");
        expect(button.querySelector("[data-icon='copy']")).not.toBeNull();
        expect(document.querySelector("#linkCopiedMsg").textContent).toBe("");
      } finally {
        vi.useRealTimers();
      }
    });

    it("shows an error and selects the link when copying is rejected", async () => {
      stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
      const input = renderLinkModal();
      input.click();

      await vi.waitFor(() => shouldDisplayErrorSnackbar("Couldn't copy the link"));
      expect(input.selectionEnd - input.selectionStart).toBe(input.value.length);
    });

    it("drops the copied confirmation when a later copy fails", async () => {
      const writeText = stubClipboard();
      const input = renderLinkModal();
      const message = document.querySelector("#linkCopiedMsg");
      input.click();
      await vi.waitFor(() => expect(message.textContent).not.toBe(""));

      writeText.mockRejectedValue(new Error("denied"));
      input.click();

      await vi.waitFor(() => expect(message.textContent).toBe(""));
      expect(document.querySelector("#copyLinkBtn").getAttribute("aria-label")).toBe("Copy link");
    });

    it("shows an error when the clipboard is unavailable", async () => {
      Object.defineProperty(navigator, "clipboard", {value: undefined, configurable: true});
      renderLinkModal().click();

      await vi.waitFor(() => shouldDisplayErrorSnackbar("Couldn't copy the link"));
    });

    it("shows instructions to send the link to participants", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "link", exchangeId: "abc-123", assignments: []});

      expect(document.querySelector("#completionModal").textContent).toContain("Send this link to everyone");
    });

    it("does not show the results table", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "link", exchangeId: "abc-123", assignments: []});

      expect(document.querySelector(`#completionModal .${tableStyles.resultsCard}`)).toBeNull();
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

    it("renders BMC image link in container", () => {
      stateEvents.emit(Events.EXCHANGE_COMPLETE, {mode: "success", assignments: []});

      const link = document.querySelector("#bmc-button-container a");
      expect(link).not.toBeNull();
      expect(link.href).toContain("buymeacoffee.com/arootroatch");
      const img = link.querySelector("img");
      expect(img).not.toBeNull();
      expect(img.src).toContain("buymeacoffee.com");
    });
  });
});
