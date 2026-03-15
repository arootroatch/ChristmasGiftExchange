import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {resetState, shouldDisplayErrorSnackbar} from "../../../specHelper";
import {getState, assignRecipients, requestEmailResults} from "../../../../src/exchange/state";
import {init as initSnackbar} from "../../../../src/Snackbar";
import {init} from "../../../../src/exchange/components/EmailTable/EmailTable";
import {showConfirmation, showResultsForm} from "../../../../src/exchange/components/EmailTable/SendResults";

const mockState = {
  isSecretSanta: false,
  participants: [{name: "A"}, {name: "B"}],
  assignments: [{giver: "A", recipient: "B"}, {giver: "B", recipient: "A"}],
};

function triggerEmailTableRender() {
  getState().isSecretSanta = false;
  getState().participants = [{name: "Alex", email: ""}, {name: "Whitney", email: ""}];
  getState().assignments = [{giver: "Alex", recipient: "Whitney"}, {giver: "Whitney", recipient: "Alex"}];
  requestEmailResults();
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

  describe("showConfirmation back button", () => {
    it("shows back button on confirmation screen", () => {
      showConfirmation(mockState);

      const backBtn = document.querySelector("#sendResultsBackBtn");
      expect(backBtn).not.toBeNull();
      expect(backBtn.textContent).toContain("\u2190");
    });

    it("back button removes confirmation and re-renders email table", () => {
      triggerEmailTableRender();
      document.querySelector("#sendResultsBtn").click();

      expect(document.querySelector("#sendResultsConfirm")).not.toBeNull();

      document.querySelector("#sendResultsBackBtn").click();

      expect(document.querySelector("#sendResultsConfirm")).toBeNull();
      expect(document.querySelector("#emailTable")).not.toBeNull();
    });
  });

  describe("showResultsForm back button", () => {
    it("shows back button on results form", () => {
      showConfirmation(mockState);
      document.querySelector("#sendResultsConfirmBtn").click();

      const backBtn = document.querySelector("#sendResultsBackBtn");
      expect(backBtn).not.toBeNull();
      expect(backBtn.textContent).toContain("\u2190");
    });

    it("back button on results form removes form and re-renders email table", () => {
      triggerEmailTableRender();
      document.querySelector("#sendResultsBtn").click();
      document.querySelector("#sendResultsConfirmBtn").click();

      expect(document.querySelector("#sendResults")).not.toBeNull();
      expect(document.querySelector("#emailTable")).toBeNull();

      document.querySelector("#sendResultsBackBtn").click();

      expect(document.querySelector("#sendResults")).toBeNull();
      expect(document.querySelector("#emailTable")).not.toBeNull();
    });
  });
});
