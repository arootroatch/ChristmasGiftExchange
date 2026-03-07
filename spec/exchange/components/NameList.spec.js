import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {
  initReactiveSystem,
  resetState,
  removeAllNames,
  removeAllHouses,
  clearNameSelects,
  shouldSelect,
  shouldNotSelect,
  shouldBeDraggable,
  click,
  enterName,
  addHouseToDOM,
  moveNameToHouse,
} from "../../specHelper";
import {getState} from "../../../src/exchange/state";

describe('nameList', () => {

  beforeAll(() => {
    initReactiveSystem();
  });

  beforeEach(() => {
    resetState();
    removeAllNames();
    removeAllHouses();
    clearNameSelects();
  });

  describe('#add-name-btn click handler', () => {
    it('capitalizes first letter, adds participant to state, and clears input', () => {
      enterName("alex");
      expect(getState().participants.length).toBe(1);
      expect(getState().participants[0].name).toBe("Alex");
      expect(document.querySelector("#name-input").value).toBe("");
    });

    it('adds participant when Enter is pressed in input', () => {
      const input = document.querySelector("#name-input");
      input.value = "alex";
      const event = new KeyboardEvent('keyup', {
        keyCode: 13,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
      expect(getState().participants.length).toBe(1);
      expect(getState().participants[0].name).toBe("Alex");
    });

    it('does nothing when input is empty', () => {
      click("#add-name-btn");
      expect(getState().participants.length).toBe(0);
    });

    it('rejects whitespace-only input', () => {
      const input = document.querySelector("#name-input");
      input.value = "   ";
      click("#add-name-btn");
      expect(getState().participants.length).toBe(0);
    });
  });

  describe('rendering names in #participants', () => {
    it('renders name-wrapper in #participants when name is added', () => {
      enterName("Alex");
      shouldSelect("#participants #wrapper-Alex");
    });

    it('renders delete button for added name', () => {
      enterName("Alex");
      shouldSelect("#participants [id^='delete-Alex']");
    });

    it('name-wrapper is draggable', () => {
      enterName("Alex");
      shouldBeDraggable("#wrapper-Alex");
    });
  });

  describe('removing names', () => {
    it('removes name-wrapper from #participants when delete is clicked', () => {
      enterName("Alex");
      const deleteBtn = document.querySelector("#participants [id^='delete-Alex']");
      click(`#${deleteBtn.id}`);
      shouldNotSelect("#wrapper-Alex");
    });

    it('removes participant from state when delete is clicked', () => {
      enterName("Alex");
      const deleteBtn = document.querySelector("#participants [id^='delete-Alex']");
      click(`#${deleteBtn.id}`);
      expect(getState().participants.length).toBe(0);
    });
  });

  describe('interaction with houses', () => {
    it('removes name from #participants when moved to a house', () => {
      enterName("Alex");
      addHouseToDOM();
      moveNameToHouse("#house-0-select", "Alex");
      shouldNotSelect("#participants #wrapper-Alex");
    });

    it('shows name in #participants when moved back from house', () => {
      enterName("Alex");
      addHouseToDOM();
      moveNameToHouse("#house-0-select", "Alex");
      shouldNotSelect("#participants #wrapper-Alex");
      moveNameToHouse("#name-list-select", "Alex");
      shouldSelect("#participants #wrapper-Alex");
    });

    it('delete button on name in house removes name from house in state', () => {
      enterName("Alex");
      addHouseToDOM();
      moveNameToHouse("#house-0-select", "Alex");
      expect(getState().houses.find(h => h.id === "house-0").members).toContain("Alex");
      const deleteBtn = document.querySelector("[id^='delete-Alex']");
      click(`#${deleteBtn.id}`);
      expect(getState().houses.find(h => h.id === "house-0").members).not.toContain("Alex");
    });
  });
});
