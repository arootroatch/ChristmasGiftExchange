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
import {getSessionUser} from "../../../src/session.js";
vi.mock("../../../src/session.js", () => ({
  getSessionUser: vi.fn(() => null),
  setSessionUser: vi.fn(),
}));

function stubAuthCodeFetch() {
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({})
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

function fillAndSendCode(name = "Alex", email = "alex@test.com") {
  if (name) {
    document.querySelector("#auth-name").value = name;
  }
  document.querySelector("#auth-email").value = email;
  document.querySelector("#auth-send-code").click();
}

function fillAndVerifyCode(code = "123456") {
  document.querySelector("#auth-code").value = code;
  document.querySelector("#auth-verify-code").click();
}

describe("OrganizerForm", () => {
  vi.useFakeTimers();

  beforeAll(() => {
    initSnackbar();
    init();
    initEmailTable();
  });

  beforeEach(() => {
    stubAuthCodeFetch();
    resetState();
    document.querySelector("#organizerFormContainer")?.remove();
    document.querySelector("#emailTable")?.remove();
    vi.spyOn(state, "setOrganizer");
    getSessionUser.mockReturnValue(null);
  });

  describe("reactive rendering", () => {
    it("renders on RECIPIENTS_ASSIGNED when isSecretSanta", () => {
      triggerSecretSantaAssign();

      shouldSelect("#organizerFormContainer");
      shouldSelect("#auth-name");
      shouldSelect("#auth-email");
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

  describe("auth gate structure", () => {
    beforeEach(() => {
      triggerSecretSantaAssign();
    });

    it("has a heading", () => {
      const heading = document.querySelector("#organizerFormContainer h2");
      expect(heading).not.toBeNull();
      expect(heading.textContent).toContain("organiz");
    });

    it("has a name input", () => {
      const input = document.querySelector("#auth-name");
      expect(input).not.toBeNull();
      expect(input.type).toBe("text");
    });

    it("has an email input", () => {
      const input = document.querySelector("#auth-email");
      expect(input).not.toBeNull();
      expect(input.type).toBe("email");
    });

    it("has a send code button", () => {
      const btn = document.querySelector("#auth-send-code");
      expect(btn).not.toBeNull();
    });
  });

  describe("send code step", () => {
    beforeEach(() => {
      triggerSecretSantaAssign();
    });

    it("calls api-auth-code-post with email", () => {
      fillAndSendCode("Alex", "alex@test.com");

      expect(global.fetch).toHaveBeenCalledWith(
        "/.netlify/functions/api-auth-code-post",
        expect.objectContaining({method: "POST"})
      );
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.email).toBe("alex@test.com");
    });

    it("shows code step on success", async () => {
      fillAndSendCode("Alex", "alex@test.com");
      await vi.advanceTimersByTimeAsync(0);

      expect(document.querySelector("#auth-email-step").style.display).toBe("none");
      expect(document.querySelector("#auth-code-step").style.display).toBe("");
    });

    it("does not send when email is empty", () => {
      fillAndSendCode("Alex", "");

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("verify code step", () => {
    beforeEach(async () => {
      triggerSecretSantaAssign();
      fillAndSendCode("Alex", "alex@test.com");
      await vi.advanceTimersByTimeAsync(0);
      global.fetch.mockClear();
      stubAuthCodeFetch();
    });

    it("calls api-auth-verify-post with email, code, and name", () => {
      fillAndVerifyCode("123456");

      expect(global.fetch).toHaveBeenCalledWith(
        "/.netlify/functions/api-auth-verify-post",
        expect.objectContaining({method: "POST"})
      );
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.email).toBe("alex@test.com");
      expect(body.code).toBe("123456");
      expect(body.name).toBe("Alex");
    });

    it("calls setOrganizer on success", async () => {
      fillAndVerifyCode("123456");
      await vi.advanceTimersByTimeAsync(0);

      expect(state.setOrganizer).toHaveBeenCalled();
    });

    it("removes the form on success", async () => {
      fillAndVerifyCode("123456");
      await vi.advanceTimersByTimeAsync(0);

      shouldNotSelect("#organizerFormContainer");
    });

    it("shows EmailTable after successful verification in secret santa mode", async () => {
      fillAndVerifyCode("123456");
      await vi.advanceTimersByTimeAsync(0);

      shouldSelect("#emailTable");
    });

    it("does not verify when code is empty", () => {
      fillAndVerifyCode("");

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe("authenticated user bypass", () => {
    it("calls setOrganizer directly when user is authenticated (secret santa)", () => {
      getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
      triggerSecretSantaAssign();

      expect(state.setOrganizer).toHaveBeenCalled();
      shouldNotSelect("#organizerFormContainer");
    });

    it("calls setOrganizer directly when user is authenticated (email results)", () => {
      getSessionUser.mockReturnValue({name: "Alice", email: "alice@test.com"});
      triggerNonSecretSantaEmailResults();

      expect(state.setOrganizer).toHaveBeenCalled();
      shouldNotSelect("#organizerFormContainer");
    });

    it("shows organizer form when no authenticated user", () => {
      getSessionUser.mockReturnValue(null);
      triggerSecretSantaAssign();

      shouldSelect("#organizerFormContainer");
      expect(state.setOrganizer).not.toHaveBeenCalled();
    });
  });
});
