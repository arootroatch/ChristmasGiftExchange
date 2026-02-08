import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {state, startExchange} from '../resources/js/state';
import {initReactiveSystem, resetDOM} from "./specHelper";
import {initEventListeners, secretSantaMode} from "../resources/js/layout";

describe('layout', () => {
  let letsGoBtn, secretSantaBtn, leftContainer;

  beforeAll(async () => {
    initReactiveSystem();
  });

  beforeEach(() => {
    resetDOM();
    initEventListeners();
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

      expect(state.isSecretSanta).toBe(true);
    });

    it('adds secret class to left-container', () => {
      expect(leftContainer.classList).not.toContain('secret');

      secretSantaMode();

      expect(leftContainer.classList).toContain('secret');
    });

    it('does not show results-table in secret santa mode', () => {
      secretSantaMode();

      const resultsTable = document.querySelector("#results-table");
      expect(resultsTable.style.display).toBe('none');
    });
  });

  describe('event listeners', () => {

    it('letsGo button has click listener attached', () => {
      letsGoBtn.click();

      const nameList = document.querySelector("#name-list");
      expect(nameList.style.display).toBe('block');
    });

    it('secretSantaBtn button has click listener attached', () => {
      expect(state.isSecretSanta).toBe(false);

      secretSantaBtn.click();

      expect(state.isSecretSanta).toBe(true);
    });

    it('nextStep button has click listener attached', () => {
      startExchange(false);
      const nextStepBtn = document.querySelector("#nextStep");
      state.step = 0;
      state.givers = [{name: 'Alice', recipient: ''}];

      nextStepBtn.click();

      expect(state.step).toBeGreaterThan(0);
    });
  });
});
