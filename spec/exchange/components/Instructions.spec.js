import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {init as initInstructions, instructions, resetAnimating} from "../../../src/exchange/components/Instructions";
import {nextStep} from "../../../src/exchange/state";
import {resetDOM, resetState} from "../../specHelper";

describe("instructions", () => {
  beforeAll(() => {
    initInstructions();
  });

  beforeEach(() => {
    resetDOM();
    resetAnimating();
  });

  it("renders Step 1 after exchange starts", () => {
    resetState();
    const intro = document.querySelector("#intro");
    expect(intro.innerHTML).toContain("Step 1 / 4");
  });

  it("applies slide-in-right class on first render", () => {
    resetState();
    const p = document.querySelector("#intro p");
    expect(p.classList.contains("slide-in-right")).toBe(true);
  });

  it("updates content on NEXT_STEP after animationend", () => {
    resetState();
    nextStep(3);

    // Old paragraph should have slide-out-left
    const oldP = document.querySelector("#intro p");
    expect(oldP.classList.contains("slide-out-left")).toBe(true);

    // Content hasn't changed yet (waiting for animationend)
    expect(oldP.textContent).toContain("Step 1 / 4");

    // Dispatch animationend to complete the transition
    oldP.dispatchEvent(new Event("animationend"));

    // Now the new content should be rendered
    const newP = document.querySelector("#intro p");
    expect(newP.innerHTML).toContain("Step 2 / 4");
    expect(newP.classList.contains("slide-in-right")).toBe(true);
  });

  it("drops rapid clicks while animating", () => {
    resetState();
    nextStep(3);

    const oldP = document.querySelector("#intro p");

    // Second nextStep while animation is in progress
    nextStep(3);

    // Still showing step 1 text with slide-out-left
    expect(oldP.classList.contains("slide-out-left")).toBe(true);
    expect(oldP.textContent).toContain("Step 1 / 4");

    // Complete the first animation
    oldP.dispatchEvent(new Event("animationend"));

    // Should show step 2 (not step 3)
    const newP = document.querySelector("#intro p");
    expect(newP.innerHTML).toContain("Step 2 / 4");
  });
});
