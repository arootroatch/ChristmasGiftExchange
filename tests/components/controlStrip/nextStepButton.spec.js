import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {click, resetDOM, resetState} from "../../specHelper";
import {init as initControlStrip} from "../../../resources/js/components/controlStrip/controlStrip";
import {init as initNextStepButton} from "../../../resources/js/components/controlStrip/nextStepButton";
import {state} from "../../../resources/js/state";
import {selectElement} from "../../../resources/js/utils";
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
});
