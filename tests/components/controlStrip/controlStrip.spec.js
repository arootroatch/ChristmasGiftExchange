import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {resetDOM, resetState} from "../../specHelper";
import {init as initControlStrip} from "../../../resources/js/components/controlStrip/controlStrip";
import {isMobileDevice, selectElement, selectElements} from "../../../resources/js/utils";

describe("controlStrip", () => {
  beforeAll(() => {
    initControlStrip();
  });

  beforeEach(() => {
    resetDOM();
  });

  it("does not render before exchange starts", () => {
    expect(selectElement("#control-strip")).toBeNull();
  });

  it("renders shell with slots after EXCHANGE_STARTED", () => {
    resetState();
    expect(selectElement("#control-strip")).not.toBeNull();
    expect(selectElement('[data-slot="generate"]')).not.toBeNull();
    expect(selectElement('[data-slot="addHouse"]')).not.toBeNull();
    expect(selectElement('[data-slot="nextStep"]')).not.toBeNull();
  });

  it("renders only once on repeated EXCHANGE_STARTED", () => {
    resetState();
    resetState();
    expect(selectElements("#control-strip").length).toBe(1);
  });

  describe("isMobileDevice", () => {
    it("detects iPhone as mobile", () => {
      expect(isMobileDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15")).toBe(true);
    });

    it("detects Android as mobile", () => {
      expect(isMobileDevice("Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36")).toBe(true);
    });

    it("detects iPad as mobile", () => {
      expect(isMobileDevice("Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15")).toBe(true);
    });

    it("detects Windows desktop as non-mobile", () => {
      expect(isMobileDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")).toBe(false);
    });

    it("detects Mac as non-mobile", () => {
      expect(isMobileDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")).toBe(false);
    });
  });
});
