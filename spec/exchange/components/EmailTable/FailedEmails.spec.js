import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {init as initSnackbar} from "../../../../src/Snackbar";
import {
  showFailedEmails,
  removeFailedEmails,
  resetRetryCount,
} from "../../../../src/exchange/components/EmailTable/FailedEmails";
import * as state from "../../../../src/exchange/state";
import {shouldDisplaySuccessSnackbar} from "../../../specHelper";

const failedParticipants = [
  {name: "Alex", email: "alex@test.com"},
];
const failedAssignments = [
  {giver: "Alex", recipient: "Whitney"},
];
const payload = {
  exchangeId: "test-exchange-id",
  participants: failedParticipants,
  assignments: failedAssignments,
};

describe("FailedEmails", () => {
  vi.useFakeTimers();

  beforeAll(() => {
    initSnackbar();
  });

  beforeEach(() => {
    resetRetryCount();
    document.querySelector("#failedEmails")?.remove();
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({sent: 1, total: 1, emailsFailed: []}),
    }));
  });

  describe("first failure (retryCount = 0)", () => {
    it("shows Retry button", () => {
      showFailedEmails(["alex@test.com"], payload);

      const retryBtn = document.querySelector("#retryEmailsBtn");
      expect(retryBtn).not.toBeNull();
      expect(retryBtn.textContent).toContain("Retry");
    });

    it("shows Back button", () => {
      showFailedEmails(["alex@test.com"], payload);

      const backBtn = document.querySelector("#backToEmailsBtn");
      expect(backBtn).not.toBeNull();
      expect(backBtn.textContent).toContain("\u2190");
    });

    it("does not show View Results button", () => {
      showFailedEmails(["alex@test.com"], payload);

      expect(document.querySelector("#viewResultsBtn")).toBeNull();
    });

    it("shows the failed email address", () => {
      showFailedEmails(["alex@test.com"], payload);

      const failedEl = document.querySelector("#failedEmails");
      expect(failedEl).not.toBeNull();
      expect(failedEl.textContent).toContain("alex@test.com");
    });

    it("calls onBack with failed participants and assignments when Back button clicked", () => {
      const onBack = vi.fn();
      showFailedEmails(["alex@test.com"], payload, {onBack});

      document.querySelector("#backToEmailsBtn").click();

      expect(onBack).toHaveBeenCalledWith(failedParticipants, failedAssignments);
    });

    it("does not throw when onBack is not provided and Back is clicked", () => {
      showFailedEmails(["alex@test.com"], payload);

      expect(() => document.querySelector("#backToEmailsBtn").click()).not.toThrow();
    });

    it("sends exchangeId and participantEmails to api-giver-retry-post on retry", async () => {
      showFailedEmails(["alex@test.com"], payload);

      document.querySelector("#retryEmailsBtn").click();
      await vi.advanceTimersByTimeAsync(0);

      const callArgs = global.fetch.mock.calls[0];
      expect(callArgs[0]).toBe("/.netlify/functions/api-giver-retry-post");
      const body = JSON.parse(callArgs[1].body);
      expect(body.token).toBeUndefined();
      expect(body.exchangeId).toBe("test-exchange-id");
      expect(body.participantEmails).toEqual(["alex@test.com"]);
      expect(body.participants).toBeUndefined();
      expect(body.assignments).toBeUndefined();
    });
  });

  describe("second failure (retryCount >= 1)", () => {
    beforeEach(() => {
      // Simulate first retry by calling showFailedEmails with retryCount already at 1
      showFailedEmails(["alex@test.com"], payload);
      // Click retry to increment count
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({sent: 0, total: 1, emailsFailed: ["alex@test.com"]}),
      }));
      document.querySelector("#retryEmailsBtn").click();
    });

    it("shows apology text instead of retry button", async () => {
      await vi.advanceTimersByTimeAsync(0);

      const failedEl = document.querySelector("#failedEmails");
      expect(failedEl).not.toBeNull();
      expect(document.querySelector("#retryEmailsBtn")).toBeNull();
    });

    it("shows View Results button", async () => {
      await vi.advanceTimersByTimeAsync(0);

      const viewResultsBtn = document.querySelector("#viewResultsBtn");
      expect(viewResultsBtn).not.toBeNull();
      expect(viewResultsBtn.textContent).toContain("View Results");
    });

    it("does not show Back button", async () => {
      await vi.advanceTimersByTimeAsync(0);

      expect(document.querySelector("#backToEmailsBtn")).toBeNull();
    });

    it("View Results button calls completeExchange with results mode", async () => {
      await vi.advanceTimersByTimeAsync(0);

      vi.spyOn(state, "completeExchange");
      document.querySelector("#viewResultsBtn").click();

      expect(state.completeExchange).toHaveBeenCalledWith("results");
    });
  });

  describe("removeFailedEmails", () => {
    it("removes the failed emails element from the DOM", () => {
      showFailedEmails(["alex@test.com"], payload);
      expect(document.querySelector("#failedEmails")).not.toBeNull();

      removeFailedEmails();

      expect(document.querySelector("#failedEmails")).toBeNull();
    });

    it("does not throw when element is not present", () => {
      expect(() => removeFailedEmails()).not.toThrow();
    });
  });
});
