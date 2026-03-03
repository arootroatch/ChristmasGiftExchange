import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  click,
  expectColor,
  installGivers,
  resetState,
  shouldDisplaySuccessSnackbar,
} from "../../specHelper";
import {startExchange, state, addEmailsToParticipants, assignRecipients} from "../../../src/state";
import {init} from "../../../src/components/EmailTable/SendEmails";
import {init as initSnackbar} from "../../../src/components/Snackbar";
import {alex, hunter, megan, whitney} from "../../testData";

function stubDispatchEmailFetch() {
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({})
  }));
}

describe("sendEmails", () => {
  vi.useFakeTimers();

  beforeAll(() => {
    initSnackbar();
    init();
  });

  beforeEach(() => {
    stubDispatchEmailFetch();
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
      state._tokenMap = [
        {name: "Alex", email: alex.email, token: "token-alex"},
        {name: "Whitney", email: whitney.email, token: "token-whitney"},
        {name: "Hunter", email: hunter.email, token: "token-hunter"},
        {name: "Megan", email: megan.email, token: "token-megan"},
      ];
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

    it("sends emails for each assignment with wishlistEditUrl", () => {
      state.assignments.forEach((assignment) => {
        const participant = state.participants.find(p => p.name === assignment.giver);
        const tokenInfo = state._tokenMap.find(t => t.name === assignment.giver);
        expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/dispatchEmail", {
          body: JSON.stringify({
            name: assignment.giver,
            recipient: assignment.recipient,
            email: participant.email,
            wishlistEditUrl: `${window.location.origin}/wishlist/edit/${tokenInfo.token}`
          }),
          method: "POST",
          mode: "cors",
        });
      });
    });

    it("sends emails without wishlistEditUrl when no token map", () => {
      // Reset and trigger without token map
      resetState();
      const existing = document.querySelector("#sendEmails");
      if (existing) existing.remove();
      installGivers([{...alex}, {...whitney}]);
      assignRecipients([whitney.name, alex.name]);
      state._tokenMap = undefined;
      addEmailsToParticipants([
        {name: alex.name, email: alex.email, index: 0},
        {name: whitney.name, email: whitney.email, index: 1},
      ]);
      global.fetch.mockClear();
      click("#sendEmailsBtn");

      state.assignments.forEach((assignment) => {
        const participant = state.participants.find(p => p.name === assignment.giver);
        expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/dispatchEmail", {
          body: JSON.stringify({
            name: assignment.giver,
            recipient: assignment.recipient,
            email: participant.email,
            wishlistEditUrl: null
          }),
          method: "POST",
          mode: "cors",
        });
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

    it("displays success snackbar with number of emails sent", () => {
      shouldDisplaySuccessSnackbar("Sent 4 of 4 emails successfully!");
    });
  });
});
