import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {click, resetDOM, resetState} from "../../specHelper";
import * as stateModule from "../../../resources/js/state";
import {init as initControlStrip} from "../../../resources/js/components/controlStrip/controlStrip";
import {init as initNextStepButton} from "../../../resources/js/components/controlStrip/nextStepButton";
import {init as initAddHouseButton} from "../../../resources/js/components/controlStrip/addHouseButton";
import {state} from "../../../resources/js/state";
import {selectElement} from "../../../resources/js/utils";

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
    state.givers = [{name: "Alice", recipient: ""}];
    click("#nextStep"); // step 2
    expect(state.step).toBe(2);
    expect(selectElement("#addHouse")).not.toBeNull();
  });

  it("is removed at step 3", () => {
    resetState();
    state.givers = [{name: "Alice", recipient: ""}];
    click("#nextStep"); // step 2
    expect(selectElement("#addHouse")).not.toBeNull();
    click("#nextStep"); // step 3
    expect(state.step).toBe(3);
    expect(selectElement("#addHouse")).toBeNull();
  });

  it("click calls addHouseToState", () => {
    const spy = vi.spyOn(stateModule, "addHouseToState").mockImplementation(() => {});
    resetState();
    state.givers = [{name: "Alice", recipient: ""}];
    click("#nextStep"); // step 2
    click("#addHouse");
    expect(spy).toHaveBeenCalledTimes(1);
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
      state.givers = [{name: "Alice", recipient: ""}];
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

    it("does not trigger at step 3 (button removed)", () => {
      const spy = vi.spyOn(stateModule, "addHouseToState");
      resetState();
      state.givers = [{name: "Alice", recipient: ""}];
      click("#nextStep"); // step 2
      click("#nextStep"); // step 3
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
      state.givers = [{name: "Alice", recipient: ""}];
      click("#nextStep"); // step 2
      dispatchShiftEnter();
      expect(spy).not.toHaveBeenCalled();
      Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
    });
  });
});
