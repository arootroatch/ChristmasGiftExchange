import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {click, installParticipantNames, resetDOM, resetState} from "../../specHelper";
import * as stateModule from "../../../src/exchange/state";
import {init as initControlStrip} from "../../../src/exchange/components/ControlStrip/ControlStrip";
import {init as initNextStepButton} from "../../../src/exchange/components/ControlStrip/NextStepButton";
import {init as initAddHouseButton} from "../../../src/exchange/components/ControlStrip/AddHouseButton";
import {addParticipant, assignRecipients, getState} from "../../../src/exchange/state";
import {selectElement} from "../../../src/utils";

describe("addHouseButton", () => {
  beforeAll(() => {
    initControlStrip();
    initNextStepButton();
    initAddHouseButton();
  });

  beforeEach(() => {
    resetDOM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is not rendered at step 1", () => {
    resetState();
    expect(selectElement("#addHouse")).toBeNull();
  });

  it("renders at step 2", () => {
    resetState();
    addParticipant("Alex");
    click("#nextStep"); // step 2
    expect(getState().step).toBe(2);
    expect(selectElement("#addHouse")).not.toBeNull();
  });

  it("is removed at step 4", () => {
    resetState();
    addParticipant("Alex");
    click("#nextStep");
    expect(selectElement("#addHouse")).not.toBeNull();
    click("#nextStep");
    expect(getState().step).toBe(3);
    expect(selectElement("#addHouse")).not.toBeNull();
    assignRecipients(["Whitney"]);
    click("#nextStep");
    expect(getState().step).toBe(4);
    expect(selectElement("#addHouse")).toBeNull();
  });

  it("click calls addHouseToState", () => {
    const spy = vi.spyOn(stateModule, "addHouseToState").mockImplementation(() => {});
    resetState();
    addParticipant("Alex");
    click("#nextStep"); // step 2
    click("#addHouse");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("is not removed when recipients assigned in non-secret-santa mode", () => {
    resetState();
    addParticipant("Alex");
    click("#nextStep"); // step 2
    expect(selectElement("#addHouse")).not.toBeNull();
    installParticipantNames("Alex", "Whitney");
    assignRecipients(["Whitney", "Alex"]);
    expect(selectElement("#addHouse")).not.toBeNull();
  });

  it("is removed when recipients assigned in secret santa mode", () => {
    resetState();
    getState().isSecretSanta = true;
    addParticipant("Alex");
    click("#nextStep"); // step 2
    expect(selectElement("#addHouse")).not.toBeNull();
    installParticipantNames("Alex", "Whitney");
    assignRecipients(["Whitney", "Alex"]);
    expect(selectElement("#addHouse")).toBeNull();
  });

  describe("Shift+Enter keybinding", () => {
    function dispatchShiftEnter() {
      window.dispatchEvent(new KeyboardEvent("keyup", {
        shiftKey: true, keyCode: 13, bubbles: true, cancelable: true
      }));
    }

    afterEach(() => {
      resetDOM();
      resetState();
    });

    it("triggers at step 2 (button rendered)", () => {
      const spy = vi.spyOn(stateModule, "addHouseToState").mockImplementation(() => {});
      resetState();
      addParticipant("Alex");
      click("#nextStep"); // step 2
      dispatchShiftEnter();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not trigger at step 1 (button not rendered)", () => {
      const spy = vi.spyOn(stateModule, "addHouseToState");
      resetState();
      dispatchShiftEnter();
      expect(spy).not.toHaveBeenCalled();
    });

    it("does not trigger at step 4 (button removed)", () => {
      const spy = vi.spyOn(stateModule, "addHouseToState");
      resetState();
      addParticipant("Alex");
      click("#nextStep"); // step 2
      click("#nextStep"); // step 3
      assignRecipients(["Whitney"]);
      click("#nextStep"); // step 4
      dispatchShiftEnter();
      expect(spy).not.toHaveBeenCalled();
    });

    it("does not add keybinding on mobile", () => {
      const originalUA = navigator.userAgent;
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)", configurable: true
      });
      const spy = vi.spyOn(stateModule, "addHouseToState");
      resetDOM();
      resetState();
      addParticipant("Alex");
      click("#nextStep"); // step 2
      dispatchShiftEnter();
      expect(spy).not.toHaveBeenCalled();
      Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
    });
  });
});
