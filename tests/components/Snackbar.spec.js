import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import * as snackbar from "../../src/components/Snackbar";
import {shouldDisplayErrorSnackbar, shouldDisplaySuccessSnackbar} from "../specHelper";

describe("snackbar", () => {
  let bar;

  beforeAll(() => {
    snackbar.init();
  });

  beforeEach(() => {
    bar = document.querySelector("#snackbar");
    bar.innerHTML = "";
    bar.className = "hidden";
    bar.style.color = "";
    bar.style.border = "";
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("showError", () => {
    it("displays the error message", () => {
      snackbar.showError("Something went wrong");
      expect(bar.innerHTML).toBe("Something went wrong");
    });

    it("styles with error colors", () => {
      snackbar.showError("Something went wrong");
      shouldDisplayErrorSnackbar("Something went wrong");
    });

    it("replaces hidden class with show class", () => {
      snackbar.showError("Something went wrong");
      expect(bar.classList).toContain("show");
      expect(bar.classList).not.toContain("hidden");
    });

    it("adds hide class after 5 seconds", () => {
      snackbar.showError("Something went wrong");
      vi.advanceTimersByTime(5000);
      expect(bar.classList).toContain("hide");
    });

    it("replaces show with hidden and removes hide after 5.5 seconds", () => {
      snackbar.showError("Something went wrong");
      vi.advanceTimersByTime(5500);
      expect(bar.classList).toContain("hidden");
      expect(bar.classList).not.toContain("show");
      expect(bar.classList).not.toContain("hide");
    });
  });

  describe("showSuccess", () => {
    it("displays the success message", () => {
      snackbar.showSuccess("Names generated!");
      expect(bar.innerHTML).toBe("Names generated!");
    });

    it("styles with success colors", () => {
      snackbar.showSuccess("Names generated!");
      shouldDisplaySuccessSnackbar("Names generated!");
    });

    it("replaces hidden class with show class", () => {
      snackbar.showSuccess("Names generated!");
      expect(bar.classList).toContain("show");
      expect(bar.classList).not.toContain("hidden");
    });

    it("adds hide class after 5 seconds", () => {
      snackbar.showSuccess("Names generated!");
      vi.advanceTimersByTime(5000);
      expect(bar.classList).toContain("hide");
    });

    it("replaces show with hidden and removes hide after 5.5 seconds", () => {
      snackbar.showSuccess("Names generated!");
      vi.advanceTimersByTime(5500);
      expect(bar.classList).toContain("hidden");
      expect(bar.classList).not.toContain("show");
      expect(bar.classList).not.toContain("hide");
    });
  });
});