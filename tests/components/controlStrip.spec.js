import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {resetDOM, resetState} from "../specHelper";
import * as generateModule from "../../resources/js/generate";
import * as houseModule from "../../resources/js/components/house";
import * as controlStripModule from "../../resources/js/components/controlStrip";
import {init as initControlStrip} from "../../resources/js/components/controlStrip";
import {nextStep, state} from "../../resources/js/state";

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
    expect(document.querySelector("#generate")).toBeNull();
    expect(document.querySelector("#addHouse")).toBeNull();
    expect(document.querySelector("#nextStep")).toBeNull();
  });

  it("renders after EXCHANGE_STARTED", () => {
    resetState();
    const generateBtn = document.querySelector("#generate");
    const addHouseBtn = document.querySelector("#addHouse");
    const nextStepBtn = document.querySelector("#nextStep");
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
    expect(document.querySelectorAll("#generate").length).toBe(1);
    expect(document.querySelectorAll("#addHouse").length).toBe(1);
    expect(document.querySelectorAll("#nextStep").length).toBe(1);
  });

  it("updates button visibility on NEXT_STEP", () => {
    resetState();
    const addHouseBtn = document.querySelector("#addHouse");
    const generateBtn = document.querySelector("#generate");
    const nextStepBtn = document.querySelector("#nextStep");

    nextStep();
    expect(addHouseBtn.style.display).toBe("block");
    expect(generateBtn.style.display).toBe("none");

    state.isSecretSanta = true;
    nextStepBtn.style.display = "block";
    nextStep();
    expect(addHouseBtn.style.display).toBe("none");
    expect(generateBtn.style.display).toBe("block");
    expect(nextStepBtn.style.display).toBe("none");
  });

  it("hides generate button at step 4", () => {
    resetState();
    const generateBtn = document.querySelector("#generate");
    state.step = 3;
    nextStep();
    expect(generateBtn.style.display).toBe("none");
  });

  it("wires button listeners", () => {
    const generateSpy = vi.spyOn(generateModule, "generateList").mockImplementation(() => {});
    const addHouseSpy = vi.spyOn(houseModule, "addHouse").mockImplementation(() => {});

    resetState();
    state.givers = [{name: "Alice", recipient: ""}];

    document.querySelector("#generate").click();
    document.querySelector("#addHouse").click();
    document.querySelector("#nextStep").click();

    expect(generateSpy).toHaveBeenCalledTimes(1);
    expect(addHouseSpy).toHaveBeenCalledTimes(1);
    expect(state.step).toBe(2);
  });

  describe("introNext", () => {
    it("does not advance from step 1 without givers", () => {
      resetState();
      state.step = 1;
      state.givers = [];

      controlStripModule.introNext();

      expect(state.step).toBe(1);
    });

    it("advances from step 1 with givers", () => {
      resetState();
      state.step = 1;
      state.givers = [{name: "Alice", recipient: ""}];

      controlStripModule.introNext();

      expect(state.step).toBe(2);
    });

    it("does not advance from step 3 without generation", () => {
      resetState();
      state.step = 3;
      state.givers = [{name: "Alice", recipient: ""}];

      controlStripModule.introNext();

      expect(state.step).toBe(3);
    });

    it("advances from step 3 with generated list", () => {
      resetState();
      state.step = 3;
      state.givers = [{name: "Alice", recipient: "Bob"}];

      controlStripModule.introNext();

      expect(state.step).toBe(0);
    });
  });
});
