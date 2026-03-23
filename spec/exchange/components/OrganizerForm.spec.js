import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  installGivers,
  resetState,
  shouldDisplayErrorSnackbar,
  shouldNotSelect,
  shouldSelect,
} from "../../specHelper";
import {
  assignRecipients,
  getState,
  requestEmailResults,
  startExchange,
} from "../../../src/exchange/state";
import * as state from "../../../src/exchange/state";
import {alex, whitney} from "../../testData";
import {init} from "../../../src/exchange/components/OrganizerForm";
import {init as initSnackbar} from "../../../src/Snackbar";
import {init as initEmailTable} from "../../../src/exchange/components/EmailTable/EmailTable";

function stubOrganizerApiFetch(token = "test-token-123") {
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({token})
  }));
}

function triggerSecretSantaAssign() {
  getState().isSecretSanta = true;
  installGivers([{...alex}, {...whitney}]);
  assignRecipients(["Whitney", "Alex"]);
}

function triggerNonSecretSantaEmailResults() {
  getState().isSecretSanta = false;
  installGivers([{...alex}, {...whitney}]);
  assignRecipients(["Whitney", "Alex"]);
  requestEmailResults();
}

function fillAndSubmitForm(name = "Alex", email = "alex@test.com") {
  document.querySelector("#organizerName").value = name;
  document.querySelector("#organizerEmail").value = email;
  const form = document.querySelector("#organizerForm");
  form.dispatchEvent(new Event("submit", {bubbles: true, cancelable: true}));
}

describe("OrganizerForm", () => {
  vi.useFakeTimers();

  beforeAll(() => {
    initSnackbar();
    init();
    initEmailTable();
  });

  beforeEach(() => {
    stubOrganizerApiFetch();
    resetState();
    document.querySelector("#organizerFormContainer")?.remove();
    document.querySelector("#emailTable")?.remove();
    vi.spyOn(state, "setOrganizer");
  });

  describe("reactive rendering", () => {
    it("renders on RECIPIENTS_ASSIGNED when isSecretSanta", () => {
      triggerSecretSantaAssign();

      shouldSelect("#organizerFormContainer");
      shouldSelect("#organizerName");
      shouldSelect("#organizerEmail");
    });

    it("does not render on RECIPIENTS_ASSIGNED when not isSecretSanta", () => {
      getState().isSecretSanta = false;
      installGivers([{...alex}, {...whitney}]);
      assignRecipients(["Whitney", "Alex"]);

      shouldNotSelect("#organizerFormContainer");
    });

    it("renders on EMAIL_RESULTS_REQUESTED", () => {
      triggerNonSecretSantaEmailResults();

      shouldSelect("#organizerFormContainer");
    });

    it("is removed on EXCHANGE_STARTED", () => {
      triggerSecretSantaAssign();
      shouldSelect("#organizerFormContainer");

      startExchange();

      shouldNotSelect("#organizerFormContainer");
    });

    it("does not render EmailTable on RECIPIENTS_ASSIGNED in secret santa mode", () => {
      triggerSecretSantaAssign();

      shouldNotSelect("#emailTable");
    });
  });

  describe("form structure", () => {
    beforeEach(() => {
      triggerSecretSantaAssign();
    });

    it("has a heading", () => {
      const heading = document.querySelector("#organizerFormContainer h3");
      expect(heading).not.toBeNull();
      expect(heading.textContent).toContain("organiz");
    });

    it("has a required name input", () => {
      const input = document.querySelector("#organizerName");
      expect(input.required).toBe(true);
      expect(input.type).toBe("text");
    });

    it("has a required email input", () => {
      const input = document.querySelector("#organizerEmail");
      expect(input.required).toBe(true);
      expect(input.type).toBe("email");
    });

    it("has a submit button", () => {
      const btn = document.querySelector("#organizerSubmit");
      expect(btn).not.toBeNull();
    });
  });

  describe("form submission", () => {
    beforeEach(() => {
      triggerSecretSantaAssign();
    });

    it("calls api-organizer-post with name and email", () => {
      fillAndSubmitForm("Alex", "alex@test.com");

      expect(global.fetch).toHaveBeenCalledWith(
        "/.netlify/functions/api-organizer-post",
        expect.objectContaining({method: "POST"})
      );
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.name).toBe("Alex");
      expect(body.email).toBe("alex@test.com");
    });

    it("calls setOrganizer on success", async () => {
      fillAndSubmitForm("Alex", "alex@test.com");
      await vi.advanceTimersByTimeAsync(0);

      expect(state.setOrganizer).toHaveBeenCalledWith("Alex", "alex@test.com", "test-token-123");
    });

    it("removes the form on success", async () => {
      fillAndSubmitForm("Alex", "alex@test.com");
      await vi.advanceTimersByTimeAsync(0);

      shouldNotSelect("#organizerFormContainer");
    });

    it("shows EmailTable after successful submission in secret santa mode", async () => {
      fillAndSubmitForm("Alex", "alex@test.com");
      await vi.advanceTimersByTimeAsync(0);

      shouldSelect("#emailTable");
    });

    it("shows error snackbar on API failure", async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({error: "Server error"})
      }));

      fillAndSubmitForm("Alex", "alex@test.com");
      await vi.advanceTimersByTimeAsync(0);

      shouldDisplayErrorSnackbar("Aw shucks!");
    });

    it("shows spinner on submit", () => {
      fillAndSubmitForm("Alex", "alex@test.com");

      const btn = document.querySelector("#organizerSubmit");
      expect(btn.innerHTML).toContain('class="spinner"');
      expect(btn.disabled).toBe(true);
    });

    it("does not submit when name is empty", () => {
      fillAndSubmitForm("", "alex@test.com");

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("does not submit when email is empty", () => {
      fillAndSubmitForm("Alex", "");

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
