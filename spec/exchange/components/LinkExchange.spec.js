import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {resetState, installGivers, shouldSelect, shouldNotSelect} from "../../shared/specHelper";
import {assignRecipients, getState, startExchange} from "../../../src/exchange/state";
import * as state from "../../../src/exchange/state";
import {alex, whitney} from "../../shared/testData";
import {init} from "../../../src/exchange/components/LinkExchange";
import {init as initSnackbar} from "../../../src/Snackbar";

function triggerLinkAssign() {
  getState().isSecretSanta = true;
  getState().isLinkMode = true;
  installGivers([{...alex}, {...whitney}]);
  assignRecipients(["Whitney", "Alex"]);
}

function triggerNonLinkSecretSantaAssign() {
  getState().isSecretSanta = true;
  getState().isLinkMode = false;
  installGivers([{...alex}, {...whitney}]);
  assignRecipients(["Whitney", "Alex"]);
}

describe("LinkExchange", () => {
  vi.useFakeTimers();

  beforeAll(() => {
    initSnackbar();
    init();
  });

  beforeEach(() => {
    resetState();
    document.querySelector("#linkExchangeContainer")?.remove();
    vi.spyOn(state, "completeExchange");
  });

  it("renders the save prompt on RECIPIENTS_ASSIGNED when isLinkMode", () => {
    triggerLinkAssign();
    shouldSelect("#linkExchangeContainer");
  });

  it("does not render when isSecretSanta but not isLinkMode", () => {
    triggerNonLinkSecretSantaAssign();
    shouldNotSelect("#linkExchangeContainer");
  });

  it("is removed on EXCHANGE_STARTED", () => {
    triggerLinkAssign();
    shouldSelect("#linkExchangeContainer");

    startExchange();

    shouldNotSelect("#linkExchangeContainer");
  });

  describe("No thanks path", () => {
    beforeEach(() => {
      triggerLinkAssign();
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({exchangeId: getState().exchangeId}),
      }));
    });

    it("posts to api-link-exchange-post without showing the auth gate", async () => {
      document.querySelector("#linkSaveNoBtn").click();
      await vi.advanceTimersByTimeAsync(0);

      expect(global.fetch).toHaveBeenCalledWith(
        "/.netlify/functions/api-link-exchange-post",
        expect.objectContaining({method: "POST"})
      );
      expect(document.querySelector("#auth-email")).toBeNull();
    });

    it("calls completeExchange('link') on success", async () => {
      document.querySelector("#linkSaveNoBtn").click();
      await vi.advanceTimersByTimeAsync(0);

      expect(state.completeExchange).toHaveBeenCalledWith("link");
    });

    it("removes the container on success", async () => {
      document.querySelector("#linkSaveNoBtn").click();
      await vi.advanceTimersByTimeAsync(0);

      shouldNotSelect("#linkExchangeContainer");
    });
  });

  describe("Yes, save it path", () => {
    beforeEach(() => {
      triggerLinkAssign();
    });

    it("shows the auth gate instead of posting immediately", () => {
      document.querySelector("#linkSaveYesBtn").click();

      expect(document.querySelector("#auth-email")).not.toBeNull();
    });

    it("posts to api-link-exchange-post after successful verification", async () => {
      document.querySelector("#linkSaveYesBtn").click();
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ok: true, status: 200, json: () => Promise.resolve({})}) // auth-code-post
        .mockResolvedValueOnce({ok: true, status: 200, json: () => Promise.resolve({})}) // auth-verify-post
        .mockResolvedValueOnce({ok: true, status: 200, json: () => Promise.resolve({exchangeId: getState().exchangeId})}); // link-exchange-post

      document.querySelector("#auth-name").value = "Alex";
      document.querySelector("#auth-email").value = "alex@test.com";
      document.querySelector("#auth-send-code").click();
      await vi.advanceTimersByTimeAsync(0);

      document.querySelector("#auth-code").value = "123456";
      document.querySelector("#auth-verify-code").click();
      await vi.advanceTimersByTimeAsync(0);

      expect(global.fetch).toHaveBeenNthCalledWith(3,
        "/.netlify/functions/api-link-exchange-post",
        expect.objectContaining({method: "POST"})
      );
      expect(state.completeExchange).toHaveBeenCalledWith("link");
    });
  });
});
