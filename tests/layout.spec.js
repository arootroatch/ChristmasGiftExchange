import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {state} from '../resources/js/state';
import {removeAllHouses, removeAllNames, resetState} from "./specHelper";
import {conditionalRender, initEventListeners, introNext, secretSantaMode, stepOne} from "../resources/js/layout";

describe('layout', () => {
  let nextStepBtn, letsGoBtn, secretSantaBtn, addHouseBtn, generateBtn;
  let nameList, resultsTable, intro, leftContainer;

  beforeAll(async () => {
    nameList = document.querySelector("#name-list");
    resultsTable = document.querySelector("#results-table");
    nextStepBtn = document.querySelector("#nextStep");
    letsGoBtn = document.querySelector("#letsGo");
    secretSantaBtn = document.querySelector("#secretSantaBtn");
    addHouseBtn = document.querySelector("#addHouse");
    generateBtn = document.querySelector("#generate");
    intro = document.querySelector("#intro");
    leftContainer = document.querySelector("#left-container");
  });

  beforeEach(() => {
    nameList.style.display = 'none';
    resultsTable.style.display = 'none';
    leftContainer.classList.remove("secret");
    resetState();
    removeAllNames();
    removeAllHouses();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('stepOne', () => {
    it('displays name-list', () => {
      stepOne();

      expect(nameList.style.display).toBe('block');
    });

    it('displays results-table in normal mode', () => {
      state.isSecretSanta = false;

      stepOne();

      expect(resultsTable.style.display).toBe('table');
    });

    it('does not display results-table in secret santa mode', () => {
      state.isSecretSanta = true;

      stepOne();

      expect(resultsTable.style.display).toBe('none');
    });

    it('displays nextStep button', () => {
      stepOne();

      expect(nextStepBtn.style.display).toBe('block');
    });

    it('calls introNext which increments introIndex', () => {
      state.step = 0;

      stepOne();

      expect(state.step).toBe(1);
    });
  });

  describe('introNext', () => {
    it('does not advance from step 1 without givers', () => {
      state.step = 1;
      state.givers = [];

      introNext();

      expect(state.step).toBe(1);
    });

    it('advances from step 1 with givers', () => {
      state.step = 1;
      state.givers = [{name: 'Alice', recipient: ''}];

      introNext();

      expect(state.step).toBe(2);
      expect(intro.innerHTML).toContain('Step 2 / 4');
    });

    it('does not advance from step 3 without generation', () => {
      state.step = 3;
      state.givers = [{name: 'Alice', recipient: ''}];

      introNext();

      expect(state.step).toBe(3);
    });

    it('advances from step 3 with generated list', () => {
      state.step = 3;
      state.givers = [{name: 'Alice', recipient: 'Bob'}];

      introNext();

      expect(state.step).toBe(4);
      expect(nextStepBtn.style.display).toBe('none');
    });

    it('updates intro div innerHTML with step content', () => {
      state.step = 0;
      state.givers = [{name: 'Alice', recipient: ''}];

      introNext();

      expect(intro.innerHTML).toContain('Step 1 / 4');
      expect(state.step).toBe(1);
    });

    it('calls conditionalRender to update button visibility', () => {
      state.step = 0;
      state.givers = [{name: 'Alice', recipient: ''}];

      introNext();

      expect(state.step).toBe(1);
      expect(addHouseBtn.style.display).toBe('none');
    });
  });

  describe('conditionalRender', () => {
    it('does nothing at step 0', () => {
      state.step = 0;
      addHouseBtn.style.display = 'block';
      generateBtn.style.display = 'block';

      conditionalRender();

      expect(addHouseBtn.style.display).toBe('block');
      expect(generateBtn.style.display).toBe('block');
    });

    it('hides addHouse button at step 1', () => {
      state.step = 1;
      addHouseBtn.style.display = 'block';

      conditionalRender();

      expect(addHouseBtn.style.display).toBe('none');
    });

    it('shows addHouse button at step 2', () => {
      state.step = 2;

      conditionalRender();

      expect(addHouseBtn.style.display).toBe('block');
      expect(generateBtn.style.display).toBe('none');
    });

    it('shows generate button in normal mode at step 3', () => {
      state.step = 3;
      state.isSecretSanta = false;

      conditionalRender();

      expect(generateBtn.style.display).toBe('block');
      expect(addHouseBtn.style.display).toBe('none');
    });

    it('shows generate button in secret santa mode at step 3 - hides nextStep button', () => {
      state.step = 3;
      state.isSecretSanta = true;

      conditionalRender();

      expect(generateBtn.style.display).toBe('block');
      expect(nextStepBtn.style.display).toBe('none');
    });

    it('hides generate buttons at step 4', () => {
      state.step = 4;
      generateBtn.style.display = 'block';

      conditionalRender();

      expect(generateBtn.style.display).toBe('none');
    });
  });

  describe('secretSantaMode', () => {
    it('sets secretSanta state to true', () => {
      expect(state.isSecretSanta).toBe(false);

      secretSantaMode();

      expect(state.isSecretSanta).toBe(true);
    });

    it('adds secret class to left-container', () => {
      expect(leftContainer.classList).not.toContain('secret');

      secretSantaMode();

      expect(leftContainer.classList).toContain('secret');
    });

    it('calls stepOne to initialize the flow', () => {
      expect(nameList.style.display).toBe('none');

      secretSantaMode();

      expect(nameList.style.display).toBe('block');
      expect(nextStepBtn.style.display).toBe('block');
    });

    it('does not show results-table in secret santa mode', () => {
      secretSantaMode();

      expect(resultsTable.style.display).toBe('none');
    });
  });

  describe('event listeners', () => {

    it('letsGo button has click listener attached', () => {
      expect(nameList.style.display).toBe('none');

      letsGoBtn.click();

      expect(nameList.style.display).toBe('block');
    });

    it('secretSantaBtn button has click listener attached', () => {
      expect(state.isSecretSanta).toBe(false);

      secretSantaBtn.click();

      expect(state.isSecretSanta).toBe(true);
    });

    it('nextStep button has click listener attached', () => {
      state.step = 0;
      state.givers = [{name: 'Alice', recipient: ''}];

      nextStepBtn.click();

      expect(state.step).toBeGreaterThan(0);
    });
  });
});
