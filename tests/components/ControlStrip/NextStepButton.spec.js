import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {click, resetDOM, resetState} from "../../specHelper";
import * as stateModule from "../../../src/state";
import {init as initControlStrip} from "../../../src/components/ControlStrip/ControlStrip";
import {init as initNextStepButton} from "../../../src/components/ControlStrip/NextStepButton";
import {state} from "../../../src/state";
import {selectElement} from "../../../src/utils";
import {alex, whitney} from "../../testData";

describe("nextStepButton", () => {
  beforeAll(() => {
    initControlStrip();
    initNextStepButton();
  });

  beforeEach(() => {
    resetDOM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders after EXCHANGE_STARTED", () => {
    resetState();
    expect(selectElement("#nextStep")).not.toBeNull();
  });

  it("stays rendered at step 2", () => {
    resetState();
    state.givers = [{...alex}];
    click("#nextStep");
    expect(state.step).toBe(2);
    expect(selectElement("#nextStep")).not.toBeNull();
  });

  it("stays rendered at step 3 (non-secret-santa)", () => {
    resetState();
    state.givers = [{...alex}];
    click("#nextStep"); // step 2
    click("#nextStep"); // step 3
    expect(state.step).toBe(3);
    expect(selectElement("#nextStep")).not.toBeNull();
  });

  it("is removed at step 3 with isSecretSanta", () => {
    resetState();
    state.givers = [{...alex}];
    state.isSecretSanta = true;
    click("#nextStep"); // step 2
    click("#nextStep"); // step 3
    expect(state.step).toBe(3);
    expect(selectElement("#nextStep")).toBeNull();
  });

  it("is removed at step 4", () => {
    resetState();
    state.givers = [{...alex, recipient: whitney.name}];
    state.step = 3;
    click("#nextStep"); // step 4
    expect(state.step).toBe(4);
    expect(selectElement("#nextStep")).toBeNull();
  });

  it("does not advance from step 1 without givers", () => {
    resetState();
    state.step = 1;
    state.givers = [];
    click("#nextStep");
    expect(state.step).toBe(1);
  });

  it("advances from step 1 with givers", () => {
    resetState();
    state.step = 1;
    state.givers = [{...alex}];
    click("#nextStep");
    expect(state.step).toBe(2);
  });

  it("does not advance from step 3 without generation", () => {
    resetState();
    state.step = 3;
    state.givers = [{...alex}];
    click("#nextStep");
    expect(state.step).toBe(3);
  });

  it("advances from step 3 with generated list", () => {
    resetState();
    state.step = 3;
    state.givers = [{...alex, recipient: whitney.name}];
    click("#nextStep");
    expect(state.step).toBe(4);
  });

  describe("Alt+Enter keybinding", () => {
    function dispatchAltEnter() {
      window.dispatchEvent(new KeyboardEvent("keyup", {
        altKey: true, keyCode: 13, bubbles: true, cancelable: true
      }));
    }

    afterEach(() => {
      resetDOM();
      resetState();
    });

    it("triggers at step 1 (button rendered)", () => {
      const spy = vi.spyOn(stateModule, "nextStep").mockImplementation(() => {});
      resetState();
      state.givers = [{...alex}];
      dispatchAltEnter();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not trigger at step 4 (button removed)", () => {
      resetState();
      state.givers = [{...alex, recipient: whitney.name}];
      state.step = 3;
      click("#nextStep"); // step 4
      const spy = vi.spyOn(stateModule, "nextStep");
      dispatchAltEnter();
      expect(spy).not.toHaveBeenCalled();
    });

    it("does not add keybinding on mobile", () => {
      const originalUA = navigator.userAgent;
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)", configurable: true
      });
      const spy = vi.spyOn(stateModule, "nextStep");
      resetDOM();
      resetState();
      state.givers = [{...alex}];
      dispatchAltEnter();
      expect(spy).not.toHaveBeenCalled();
      Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
    });
  });
});
