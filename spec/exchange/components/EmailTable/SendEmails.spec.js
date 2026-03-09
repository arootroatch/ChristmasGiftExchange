import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  click,
  expectColor,
  installGivers,
  resetState,
  shouldDisplaySuccessSnackbar,
} from "../../../specHelper";
import {startExchange, getState, addEmailsToParticipants, assignRecipients} from "../../../../src/exchange/state";
import {init} from "../../../../src/exchange/components/EmailTable/SendEmails";
import {init as initSnackbar} from "../../../../src/Snackbar";
import {alex, hunter, megan, whitney} from "../../../testData";
import {serverErrorMessage} from "../../../../src/utils";

function stubDispatchEmailFetch(sent, total) {
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({sent, total})
  }));
}

describe("sendEmails", () => {
  vi.useFakeTimers();

  beforeAll(() => {
    initSnackbar();
    init();
  });

  beforeEach(() => {
    stubDispatchEmailFetch(4, 4);
    resetState();
    const existing = document.querySelector("#sendEmails");
    if (existing) existing.remove();
  });

  function triggerEmailsAdded() {
    installGivers([{...alex}, {...whitney}]);
    assignRecipients([whitney.name, alex.name]);
    addEmailsToParticipants([
      {name: alex.name, email: alex.email, index: 0},
      {name: whitney.name, email: whitney.email, index: 1},
    ]);
  }

  describe("reactive rendering", () => {
    it("renders on EMAILS_ADDED event", () => {
      triggerEmailsAdded();

      const sendDiv = document.querySelector("#sendEmails");
      expect(sendDiv).not.toBeNull();
      expect(sendDiv.innerHTML).toContain("2 email addresses added successfully!");
      expect(sendDiv.innerHTML).toContain("Now let's send out those emails:");
      expect(sendDiv.innerHTML).toContain('<button class="button" id="sendEmailsBtn">Send Emails</button>');
      expect(sendDiv.classList).toContain("show");
    });

    it("removes on EXCHANGE_STARTED event", () => {
      triggerEmailsAdded();
      expect(document.querySelector("#sendEmails")).not.toBeNull();

      startExchange();

      expect(document.querySelector("#sendEmails")).toBeNull();
    });
  });

  describe("batchEmails", () => {
    let sendEmailsButton;

    beforeEach(() => {
      installGivers([{...alex}, {...whitney}, {...hunter}, {...megan}]);
      assignRecipients([whitney.name, hunter.name, megan.name, alex.name]);
      addEmailsToParticipants([
        {name: alex.name, email: alex.email, index: 0},
        {name: whitney.name, email: whitney.email, index: 1},
        {name: hunter.name, email: hunter.email, index: 2},
        {name: megan.name, email: megan.email, index: 3},
      ]);
      sendEmailsButton = document.querySelector("#sendEmailsBtn");
      click("#sendEmailsBtn");
    });

    it("sets button text to Loading...", () => {
      expect(sendEmailsButton.innerHTML).toContain("Loading...");
      expectColor(sendEmailsButton.style.color, "rgb(128, 128, 128)", "#808080");
    });

    it("sends one bulk request with participants and assignments", () => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/api-giver-notify-post", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          participants: getState().participants,
          assignments: getState().assignments,
        }),
      });
    });

    it("hides sendEmails popup", async () => {
      const sendEmails = document.querySelector("#sendEmails");
      await vi.waitFor(() => {
        expect(sendEmails.classList).toContain("hide");
      });
      vi.advanceTimersByTime(500);
      expect(document.querySelector("#sendEmails")).toBeNull();
    });

    it("displays success snackbar with number of emails sent", async () => {
      await vi.waitFor(() => {
        shouldDisplaySuccessSnackbar("Sent 4 of 4 emails successfully!");
      });
    });
  });

  describe("batchEmails error handling", () => {
    function stubFetchNotOk(errorMessage) {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 400,
        json: () => Promise.resolve({error: errorMessage})
      }));
    }

    function setupAndClick() {
      installGivers([{...alex}, {...whitney}]);
      assignRecipients([whitney.name, alex.name]);
      addEmailsToParticipants([
        {name: alex.name, email: alex.email, index: 0},
        {name: whitney.name, email: whitney.email, index: 1},
      ]);
      click("#sendEmailsBtn");
    }

    it("displays error snackbar on fetch failure", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("Network error")));
      setupAndClick();

      const {shouldDisplayErrorSnackbar} = await import("../../../specHelper");
      await vi.waitFor(() => {
        shouldDisplayErrorSnackbar(serverErrorMessage);
      });
    });

    it("displays API error message on non-ok response", async () => {
      stubFetchNotOk("Database unavailable");
      setupAndClick();

      const {shouldDisplayErrorSnackbar} = await import("../../../specHelper");
      await vi.waitFor(() => {
        shouldDisplayErrorSnackbar("Database unavailable");
      });
    });

    it("re-renders send button on non-ok response", async () => {
      stubFetchNotOk("Database unavailable");
      setupAndClick();

      await vi.waitFor(() => {
        const btn = document.querySelector("#sendEmailsBtn");
        expect(btn).not.toBeNull();
        expect(btn.textContent).toContain("Send Emails");
      });
    });

    it("re-renders send button on network failure", async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error("Network error")));
      setupAndClick();

      await vi.waitFor(() => {
        const btn = document.querySelector("#sendEmailsBtn");
        expect(btn).not.toBeNull();
        expect(btn.textContent).toContain("Send Emails");
      });
    });
  });
});
