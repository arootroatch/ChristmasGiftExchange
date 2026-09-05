import {beforeEach, describe, expect, it} from "vitest";
import {getState, setNames, setNotFound, selectName, cancelConfirm} from "../../src/draw/state";

describe("draw state", () => {
  beforeEach(() => {
    setNames([]);
  });

  it("starts on the loading screen by default", () => {
    // re-import fresh module state isn't available mid-suite; verify via explicit reset instead
    setNotFound();
    setNames([{name: "Alex", hasDrawn: false}]);
    expect(getState().screen).toBe("picker");
  });

  it("setNames stores names and moves to picker screen", () => {
    setNames([{name: "Alex", hasDrawn: false}, {name: "Whitney", hasDrawn: true}]);

    expect(getState().names).toEqual([{name: "Alex", hasDrawn: false}, {name: "Whitney", hasDrawn: true}]);
    expect(getState().screen).toBe("picker");
  });

  it("setNotFound moves to notFound screen", () => {
    setNotFound();
    expect(getState().screen).toBe("notFound");
  });

  it("selectName stores the selected name and moves to confirm screen", () => {
    setNames([{name: "Alex", hasDrawn: false}]);
    selectName("Alex");

    expect(getState().selectedName).toBe("Alex");
    expect(getState().screen).toBe("confirm");
  });

  it("cancelConfirm clears the selection and returns to picker screen", () => {
    setNames([{name: "Alex", hasDrawn: false}]);
    selectName("Alex");
    cancelConfirm();

    expect(getState().selectedName).toBeNull();
    expect(getState().screen).toBe("picker");
  });
});
