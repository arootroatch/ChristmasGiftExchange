import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {resetDOM, resetState} from "../../../specHelper";
import * as stateModule from "../../../../src/exchange/state";
import {init as initControlStrip} from "../../../../src/exchange/components/ControlStrip/ControlStrip";
import {init as initAddHouseButton} from "../../../../src/exchange/components/ControlStrip/AddHouseButton";
import {addParticipant, assignRecipients, getState} from "../../../../src/exchange/state";
import {installParticipantNames} from "../../../specHelper";
import {selectElement} from "../../../../src/utils";

describe("addHouseButton", () => {
  beforeAll(() => {
    initControlStrip();
    initAddHouseButton();
  });

  beforeEach(() => {
    resetDOM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is not rendered before any participants added", () => {
    resetState();
    expect(selectElement("#addHouse")).toBeNull();
  });

  it("renders after first participant added", () => {
    resetState();
    addParticipant("Alex");
    expect(selectElement("#addHouse")).not.toBeNull();
  });

  it("stays rendered on subsequent participant adds", () => {
    resetState();
    addParticipant("Alex");
    addParticipant("Whitney");
    expect(selectElement("#addHouse")).not.toBeNull();
  });

  it("click calls addHouseToState", () => {
    const spy = vi.spyOn(stateModule, "addHouseToState").mockImplementation(() => {});
    resetState();
    addParticipant("Alex");

    const btn = selectElement("#addHouse");
    btn.click();

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("is removed when recipients assigned in non-secret-santa mode", () => {
    resetState();
    addParticipant("Alex");
    expect(selectElement("#addHouse")).not.toBeNull();
    installParticipantNames("Whitney");
    assignRecipients(["Whitney", "Alex"]);
    expect(selectElement("#addHouse")).toBeNull();
  });

  it("is removed when recipients assigned in secret santa mode", () => {
    resetState();
    getState().isSecretSanta = true;
    addParticipant("Alex");
    expect(selectElement("#addHouse")).not.toBeNull();
    installParticipantNames("Whitney");
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

    it("triggers when button is rendered", () => {
      const spy = vi.spyOn(stateModule, "addHouseToState").mockImplementation(() => {});
      resetState();
      addParticipant("Alex");
      dispatchShiftEnter();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not trigger before participants added", () => {
      const spy = vi.spyOn(stateModule, "addHouseToState");
      resetState();
      dispatchShiftEnter();
      expect(spy).not.toHaveBeenCalled();
    });

    it("does not trigger after recipients assigned", () => {
      const spy = vi.spyOn(stateModule, "addHouseToState");
      resetState();
      addParticipant("Alex");
      installParticipantNames("Whitney");
      assignRecipients(["Whitney", "Alex"]);
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
      dispatchShiftEnter();
      expect(spy).not.toHaveBeenCalled();
      Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
    });
  });
});
