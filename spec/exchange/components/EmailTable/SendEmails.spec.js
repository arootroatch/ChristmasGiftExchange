import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  installGivers,
  resetState,
} from "../../../specHelper";
import {startExchange, getState, assignRecipients} from "../../../../src/exchange/state";
import {init} from "../../../../src/exchange/components/EmailTable/SendEmails";
import {init as initSnackbar} from "../../../../src/Snackbar";
import {alex, whitney} from "../../../testData";

describe("sendEmails", () => {
  vi.useFakeTimers();

  beforeAll(() => {
    initSnackbar();
    init();
  });

  beforeEach(() => {
    resetState();
    const existing = document.querySelector("#sendEmails");
    if (existing) existing.remove();
  });

  describe("reactive rendering", () => {
    it("removes on EXCHANGE_STARTED event", () => {
      installGivers([{...alex}, {...whitney}]);
      assignRecipients([whitney.name, alex.name]);
      document.body.insertAdjacentHTML("beforeend", `
        <div id="sendEmails" class="sendEmails show">
          <p>2 email addresses added successfully!</p>
          <button class="button" id="sendEmailsBtn">Send Emails</button>
        </div>`);
      expect(document.querySelector("#sendEmails")).not.toBeNull();

      startExchange();

      expect(document.querySelector("#sendEmails")).toBeNull();
    });
  });
});
