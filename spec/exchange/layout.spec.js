import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {getState} from '../../src/exchange/state';
import {initReactiveSystem, resetDOM} from "../shared/specHelper";
import {secretSantaMode, render as renderInstructions} from "../../src/exchange/components/Instructions";

describe('layout', () => {
  let letsGoBtn, secretSantaBtn, leftContainer;

  beforeAll(async () => {
    initReactiveSystem();
  });

  beforeEach(() => {
    resetDOM();
    renderInstructions();
    letsGoBtn = document.querySelector("#letsGo");
    secretSantaBtn = document.querySelector("#secretSantaBtn");
    leftContainer = document.querySelector("#left-container");
    leftContainer.classList.remove("secret");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('secretSantaMode', () => {
    it('sets secretSanta state to true', () => {
      secretSantaMode();

      expect(getState().isSecretSanta).toBe(true);
    });

    it('adds secret class to left-container', () => {
      expect(leftContainer.classList).not.toContain('secret');

      secretSantaMode();

      expect(leftContainer.classList).toContain('secret');
    });

    it('does not render results-table in secret santa mode', () => {
      secretSantaMode();

      const resultsTable = document.querySelector("#results-table");
      expect(resultsTable).toBeNull();
    });
  });

  describe('event listeners', () => {

    it('letsGo button has click listener attached', () => {
      letsGoBtn.click();

      const nameList = document.querySelector("#name-list");
      expect(nameList.style.display).toBe('block');
    });

    it('secretSantaBtn button has click listener attached', () => {
      expect(getState().isSecretSanta).toBe(false);

      secretSantaBtn.click();

      expect(getState().isSecretSanta).toBe(true);
    });
  });
});
