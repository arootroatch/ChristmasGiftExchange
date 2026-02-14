import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {init as initInstructions} from "../../src/components/Instructions";
import {nextStep} from "../../src/state";
import {resetDOM, resetState} from "../specHelper";

describe("instructions", () => {
  beforeAll(() => {
    initInstructions();
  });

  beforeEach(() => {
    resetDOM();
  });

  it("renders Step 1 after exchange starts", () => {
    resetState();
    const intro = document.querySelector("#intro");
    expect(intro.innerHTML).toContain("Step 1 / 4");
  });

  it("updates content on NEXT_STEP", () => {
    resetState();
    nextStep(3);
    const intro = document.querySelector("#intro");
    expect(intro.innerHTML).toContain("Step 2 / 4");
  });
});
