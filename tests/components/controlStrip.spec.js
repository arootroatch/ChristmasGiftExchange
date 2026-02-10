import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {click, resetDOM, resetState} from "../specHelper";
import * as generateModule from "../../resources/js/generate";
import * as stateModule from "../../resources/js/state";
import {init as initControlStrip} from "../../resources/js/components/controlStrip";
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
});
