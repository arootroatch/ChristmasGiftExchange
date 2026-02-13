import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  click,
  expectColor,
  installGivers,
  resetState,
  shouldDisplaySuccessSnackbar,
  stubFetch,
} from "../../specHelper";
import {Giver, startExchange, state, addEmailsToGivers} from "../../../resources/js/state";
import {init} from "../../../resources/js/components/emailTable/sendEmails";
import {alex, hunter, megan, whitney} from "../../testData";

describe("sendEmails", () => {
  stubFetch(true, 200, {});
  vi.useFakeTimers();

  beforeAll(() => {
    init();
  });

  beforeEach(() => {
    resetState();
    const existing = document.querySelector("#sendEmails");
    if (existing) existing.remove();
  });

  function triggerEmailsAdded() {
    installGivers([
      new Giver("Alex", "Whitney", "alex@gmail.com"),
      new Giver("Whitney", "Alex", "whitney@gmail.com"),
    ]);
    addEmailsToGivers([
      {name: "Alex", email: "alex@gmail.com", index: 0},
      {name: "Whitney", email: "whitney@gmail.com", index: 1},
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
      alex.recipient = "Whitney";
      whitney.recipient = "Hunter";
      hunter.recipient = "Megan";
      megan.recipient = "Alex";
      installGivers([alex, whitney, hunter, megan]);
      addEmailsToGivers([
        {name: "Alex", email: "alex@gmail.com", index: 0},
        {name: "Whitney", email: "whitney@gmail.com", index: 1},
        {name: "Hunter", email: "hunter@gmail.com", index: 2},
        {name: "Megan", email: "megan@gmail.com", index: 3},
      ]);
      sendEmailsButton = document.querySelector("#sendEmailsBtn");
      click("#sendEmailsBtn");
    });

    it("sets button text to Loading...", () => {
      expect(sendEmailsButton.innerHTML).toContain("Loading...");
      expectColor(sendEmailsButton.style.color, "rgb(128, 128, 128)", "#808080");
    });

    it("sends emails for each giver", () => {
      state.givers.forEach((giver) => {
        expect(global.fetch).toHaveBeenCalledWith("/.netlify/functions/dispatchEmail", {
          body: JSON.stringify({
            name: giver.name,
            recipient: giver.recipient,
            email: giver.email,
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
      expect(sendEmails.classList).not.toContain("hide");
      expect(sendEmails.classList).not.toContain("show");
      expect(sendEmails.classList).toContain("hidden");
    });

    it("displays success snackbar with number of emails sent", () => {
      shouldDisplaySuccessSnackbar("Sent 4 of 4 emails successfully!");
    });
  });
});
