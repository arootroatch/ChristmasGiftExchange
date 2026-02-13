import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {click, resetDOM, resetState} from "../specHelper";
import * as generateModule from "../../resources/js/generate";
import * as stateModule from "../../resources/js/state";
import {init as initControlStrip, isMobileDevice} from "../../resources/js/components/controlStrip";
import {state} from "../../resources/js/state";
import {selectElement, selectElements} from "../../resources/js/utils";

describe("controlStrip", () => {
  beforeAll(() => {
    initControlStrip();
  });

  beforeEach(() => {
    resetDOM();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not render before exchange starts", () => {
    expect(selectElement("#generate")).toBeNull();
    expect(selectElement("#addHouse")).toBeNull();
    expect(selectElement("#nextStep")).toBeNull();
  });

  it("renders after EXCHANGE_STARTED", () => {
    resetState();
    const generateBtn = selectElement("#generate");
    const addHouseBtn = selectElement("#addHouse");
    const nextStepBtn = selectElement("#nextStep");
    expect(generateBtn).not.toBeNull();
    expect(addHouseBtn).not.toBeNull();
    expect(nextStepBtn).not.toBeNull();
    expect(generateBtn.style.display).toBe("none");
    expect(addHouseBtn.style.display).toBe("none");
    expect(nextStepBtn.style.display).toBe("block");
  });

  it("renders only once on repeated EXCHANGE_STARTED", () => {
    resetState();
    resetState();
    expect(selectElements("#generate").length).toBe(1);
    expect(selectElements("#addHouse").length).toBe(1);
    expect(selectElements("#nextStep").length).toBe(1);
  });

  it("updates button visibility on NEXT_STEP", () => {
    resetState();
    state.givers = [{name: "Alice", recipient: ""}];
    const addHouseBtn = selectElement("#addHouse");
    const generateBtn = selectElement("#generate");
    const nextStepBtn = selectElement("#nextStep");

    nextStepBtn.click();
    expect(addHouseBtn.style.display).toBe("block");
    expect(generateBtn.style.display).toBe("none");

    state.isSecretSanta = true;
    nextStepBtn.click();
    expect(addHouseBtn.style.display).toBe("none");
    expect(generateBtn.style.display).toBe("block");
    expect(nextStepBtn.style.display).toBe("none");
  });

  it("hides generate button and next step at step 4", () => {
    resetState();
    const generateBtn = selectElement("#generate");
    const nextStepBtn = selectElement("#nextStep");
    state.step = 3;
    state.givers = [{name: "Alice", recipient: "Bob"}];
    nextStepBtn.click();
    expect(generateBtn.style.display).toBe("none");
    expect(nextStepBtn.style.display).toBe("none");
  });

  it("wires button listeners", () => {
    const generateSpy = vi.spyOn(generateModule, "generateList").mockImplementation(() => {});
    const addHouseSpy = vi.spyOn(stateModule, "addHouseToState").mockImplementation(() => {});

    resetState();
    state.givers = [{name: "Alice", recipient: ""}];

    selectElement("#generate").click();
    selectElement("#addHouse").click();
    selectElement("#nextStep").click();

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(addHouseSpy).toHaveBeenCalledTimes(1);
    expect(state.step).toBe(2);
  });

  describe("introNext", () => {
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
      state.givers = [{name: "Alice", recipient: ""}];

      click("#nextStep");

      expect(state.step).toBe(2);
    });

    it("does not advance from step 3 without generation", () => {
      resetState();
      state.step = 3;
      state.givers = [{name: "Alice", recipient: ""}];

      click("#nextStep");

      expect(state.step).toBe(3);
    });

    it("advances from step 3 with generated list", () => {
      resetState();
      state.step = 3;
      state.givers = [{name: "Alice", recipient: "Bob"}];

      click("#nextStep");

      expect(state.step).toBe(4);
    });
  });

  describe("isMobileDevice", () => {
    it("detects iPhone as mobile", () => {
      const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15";
      expect(isMobileDevice(userAgent)).toBe(true);
    });

    it("detects Android as mobile", () => {
      const userAgent = "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36";
      expect(isMobileDevice(userAgent)).toBe(true);
    });

    it("detects iPad as mobile", () => {
      const userAgent = "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15";
      expect(isMobileDevice(userAgent)).toBe(true);
    });

    it("detects Windows desktop as non-mobile", () => {
      const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
      expect(isMobileDevice(userAgent)).toBe(false);
    });

    it("detects Mac as non-mobile", () => {
      const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";
      expect(isMobileDevice(userAgent)).toBe(false);
    });
  });

  describe("keybindings", () => {
    function dispatchShiftEnter() {
      const event = new KeyboardEvent("keyup", {
        shiftKey: true,
        keyCode: 13,
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(event);
    }

    function dispatchCtrlEnter() {
      const event = new KeyboardEvent("keyup", {
        ctrlKey: true,
        keyCode: 13,
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(event);
    }

    afterEach(() => {
      // Clean up keybindings between tests
      resetDOM();
      resetState();
    });

    it("Shift+Enter does not trigger addHouse at step 1 (button hidden)", () => {
      resetState();
      state.givers = [{name: "Alice", recipient: ""}];
      state.step = 1;

      const addHouseButton = selectElement("#addHouse");
      const addHouseSpy = vi.spyOn(stateModule, "addHouseToState");

      dispatchShiftEnter();

      expect(addHouseSpy).not.toHaveBeenCalled();
      expect(addHouseButton.style.display).toBe("none");
    });

    it("Shift+Enter triggers addHouse click at step 2 (button visible)", () => {
      resetState();
      state.givers = [{name: "Alice", recipient: ""}];

      // Advance to step 2
      click("#nextStep");
      expect(state.step).toBe(2);

      const addHouseButton = selectElement("#addHouse");
      const addHouseSpy = vi.spyOn(stateModule, "addHouseToState");

      dispatchShiftEnter();

      expect(addHouseSpy).toHaveBeenCalledTimes(1);
      expect(addHouseButton.style.display).toBe("block");
    });

    it("Shift+Enter does not trigger addHouse at step 3 (button hidden)", () => {
      resetState();
      state.givers = [{name: "Alice", recipient: ""}];
      state.isSecretSanta = true;

      // Advance to step 2
      click("#nextStep");
      expect(state.step).toBe(2);

      // Advance to step 3
      click("#nextStep");
      expect(state.step).toBe(3);

      const addHouseButton = selectElement("#addHouse");
      const addHouseSpy = vi.spyOn(stateModule, "addHouseToState");

      dispatchShiftEnter();

      expect(addHouseSpy).not.toHaveBeenCalled();
      expect(addHouseButton.style.display).toBe("none");
    });

    it("Ctrl+Enter does not trigger generate at step 2 (button hidden)", () => {
      resetState();
      state.givers = [{name: "Alice", recipient: ""}];

      // Advance to step 2
      click("#nextStep");
      expect(state.step).toBe(2);

      const generateButton = selectElement("#generate");
      const generateSpy = vi.spyOn(generateModule, "generateList");

      dispatchCtrlEnter();

      expect(generateSpy).not.toHaveBeenCalled();
      expect(generateButton.style.display).toBe("none");
    });

    it("Ctrl+Enter triggers generate click at step 3 (button visible)", () => {
      const generateSpy = vi.spyOn(generateModule, "generateList").mockImplementation(() => {});

      resetState();
      state.givers = [{name: "Alice", recipient: ""}];
      state.isSecretSanta = true;

      // Advance to step 2
      click("#nextStep");
      expect(state.step).toBe(2);

      // Advance to step 3
      click("#nextStep");
      expect(state.step).toBe(3);

      dispatchCtrlEnter();

      expect(generateSpy).toHaveBeenCalledTimes(1);
      expect(selectElement("#generate").style.display).toBe("block");
    });

    it("Neither keybinding triggers at step 4 (both hidden)", () => {
      resetState();
      state.givers = [{name: "Alice", recipient: "Bob"}];
      state.isSecretSanta = true;
      state.step = 3;

      // Advance to step 4
      click("#nextStep");
      expect(state.step).toBe(4);

      const addHouseSpy = vi.spyOn(stateModule, "addHouseToState");
      const generateSpy = vi.spyOn(generateModule, "generateList");

      dispatchShiftEnter();
      dispatchCtrlEnter();

      expect(addHouseSpy).not.toHaveBeenCalled();
      expect(generateSpy).not.toHaveBeenCalled();
      expect(selectElement("#addHouse").style.display).toBe("none");
      expect(selectElement("#generate").style.display).toBe("none");
    });

    it("Does not add keybindings on mobile devices", () => {
      // Override navigator.userAgent for this test
      const originalUserAgent = navigator.userAgent;
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15",
        configurable: true
      });

      // Reset and initialize with mobile UA
      resetDOM();
      resetState();
      state.givers = [{name: "Alice", recipient: ""}];

      // Advance to step 2 where addHouse keybinding would normally be added
      click("#nextStep");
      expect(state.step).toBe(2);

      const addHouseSpy = vi.spyOn(stateModule, "addHouseToState");

      dispatchShiftEnter();

      expect(addHouseSpy).not.toHaveBeenCalled();

      // Restore original userAgent
      Object.defineProperty(navigator, "userAgent", {
        value: originalUserAgent,
        configurable: true
      });
    });
  });
});
