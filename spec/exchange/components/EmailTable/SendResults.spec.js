import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {resetState, shouldDisplayErrorSnackbar, stubFetch} from "../../../specHelper";
import {getState, setOrganizer} from "../../../../src/exchange/state";
import {init as initSnackbar} from "../../../../src/Snackbar";
import {init} from "../../../../src/exchange/components/EmailTable/EmailTable";
import {showConfirmation} from "../../../../src/exchange/components/EmailTable/SendResults";

function setupState() {
  getState().isSecretSanta = false;
  getState().participants = [{name: "Alex", email: ""}, {name: "Whitney", email: ""}];
  getState().assignments = [{giver: "Alex", recipient: "Whitney"}, {giver: "Whitney", recipient: "Alex"}];
  setOrganizer();
}

describe("SendResults", () => {
  beforeAll(() => {
    initSnackbar();
    init();
  });

  beforeEach(() => {
    resetState();
    document.querySelector("#sendResultsConfirm")?.remove();
    document.querySelector("#sendResults")?.remove();
    document.querySelector("#emailTable")?.remove();
  });

  describe("showConfirmation cancel button", () => {
    it("does not show back button on confirmation screen", () => {
      showConfirmation({isSecretSanta: false});
      expect(document.querySelector("#sendResultsBackBtn")).toBeNull();
    });

    it("cancel button removes confirmation", () => {
      showConfirmation({isSecretSanta: false});
      expect(document.querySelector("#sendResultsConfirm")).not.toBeNull();

      document.querySelector("#sendResultsCancelBtn").click();

      expect(document.querySelector("#sendResultsConfirm")).toBeNull();
    });
  });

  describe("Continue button calls API directly", () => {
    it("does not render name or email inputs", () => {
      setupState();
      showConfirmation(getState());
      document.querySelector("#sendResultsConfirmBtn").click();

      expect(document.querySelector("#sendResultsName")).toBeNull();
      expect(document.querySelector("#sendResultsEmail")).toBeNull();
    });

    it("calls api-results-email-post with exchangeId on Continue", async () => {
      setupState();
      stubFetch(true, 200, {message: "sent"});

      showConfirmation(getState());
      document.querySelector("#sendResultsConfirmBtn").click();

      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      const [url, options] = global.fetch.mock.calls[0];
      expect(url).toBe("/.netlify/functions/api-results-email-post");
      expect(options.method).toBe("POST");
      const body = JSON.parse(options.body);
      expect(body.token).toBeUndefined();
      expect(body.exchangeId).toBe(getState().exchangeId);
      expect(body.name).toBeUndefined();
      expect(body.email).toBeUndefined();
      expect(body.assignments).toBeUndefined();
    });

    it("removes confirmation modal after clicking Continue", async () => {
      setupState();
      stubFetch(true, 200, {message: "sent"});

      showConfirmation(getState());
      document.querySelector("#sendResultsConfirmBtn").click();

      expect(document.querySelector("#sendResultsConfirm")).toBeNull();
    });

    it("shows error snackbar on API failure", async () => {
      setupState();
      stubFetch(false, 400, {error: "Bad request"});

      showConfirmation(getState());
      document.querySelector("#sendResultsConfirmBtn").click();

      await vi.waitFor(() => {
        shouldDisplayErrorSnackbar("Bad request");
      });
    });
  });
});
