import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {click, resetDOM, resetState} from "../../specHelper";
import * as generateModule from "../../../resources/js/generate";
import {init as initControlStrip} from "../../../resources/js/components/controlStrip/controlStrip";
import {init as initNextStepButton} from "../../../resources/js/components/controlStrip/nextStepButton";
import {init as initGenerateButton} from "../../../resources/js/components/controlStrip/generateButton";
import {state} from "../../../resources/js/state";
import {selectElement} from "../../../resources/js/utils";

describe("generateButton", () => {
  beforeAll(() => {
    initControlStrip();
    initNextStepButton();
    initGenerateButton();
  });

  beforeEach(() => {
    resetDOM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is not rendered at step 1", () => {
    resetState();
    expect(selectElement("#generate")).toBeNull();
  });

  it("is not rendered at step 2", () => {
    resetState();
    state.givers = [{name: "Alice", recipient: ""}];
    click("#nextStep"); // step 2
    expect(state.step).toBe(2);
    expect(selectElement("#generate")).toBeNull();
  });

  it("renders at step 3", () => {
    resetState();
    state.givers = [{name: "Alice", recipient: ""}];
    click("#nextStep"); // step 2
    click("#nextStep"); // step 3
    expect(state.step).toBe(3);
    expect(selectElement("#generate")).not.toBeNull();
  });

  it("click calls generateList", () => {
    const spy = vi.spyOn(generateModule, "generateList").mockImplementation(() => {});
    resetState();
    state.givers = [{name: "Alice", recipient: ""}];
    click("#nextStep"); // step 2
    click("#nextStep"); // step 3
    click("#generate");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("is removed at step 4", () => {
    resetState();
    state.givers = [{name: "Alice", recipient: "Bob"}];
    state.step = 3;
    click("#nextStep"); // step 4
    expect(state.step).toBe(4);
    expect(selectElement("#generate")).toBeNull();
  });

  describe("Ctrl+Enter keybinding", () => {
    function dispatchCtrlEnter() {
      window.dispatchEvent(new KeyboardEvent("keyup", {
        ctrlKey: true, keyCode: 13, bubbles: true, cancelable: true
      }));
    }

    afterEach(() => {
      resetDOM();
      resetState();
    });

    it("triggers at step 3 (button rendered)", () => {
      const spy = vi.spyOn(generateModule, "generateList").mockImplementation(() => {});
      resetState();
      state.givers = [{name: "Alice", recipient: ""}];
      click("#nextStep"); // step 2
      click("#nextStep"); // step 3
      dispatchCtrlEnter();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not trigger at step 2 (button not rendered)", () => {
      const spy = vi.spyOn(generateModule, "generateList");
      resetState();
      state.givers = [{name: "Alice", recipient: ""}];
      click("#nextStep"); // step 2
      dispatchCtrlEnter();
      expect(spy).not.toHaveBeenCalled();
    });

    it("does not add keybinding on mobile", () => {
      const originalUA = navigator.userAgent;
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)", configurable: true
      });
      const spy = vi.spyOn(generateModule, "generateList").mockImplementation(() => {});
      resetDOM();
      resetState();
      state.givers = [{name: "Alice", recipient: ""}];
      click("#nextStep"); // step 2
      click("#nextStep"); // step 3
      dispatchCtrlEnter();
      expect(spy).not.toHaveBeenCalled();
      Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
    });
  });
});
