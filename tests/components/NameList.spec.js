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
} from "../specHelper";
import {state} from "../../src/state";

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

  describe('#b0 click handler', () => {
    it('capitalizes first letter, adds giver to state, and clears input', () => {
      enterName("alex");
      expect(state.givers.length).toBe(1);
      expect(state.givers[0].name).toBe("Alex");
      expect(document.querySelector("#input0").value).toBe("");
    });

    it('adds giver when Enter is pressed in input', () => {
      const input = document.querySelector("#input0");
      input.value = "alex";
      const event = new KeyboardEvent('keyup', {
        keyCode: 13,
        bubbles: true,
        cancelable: true,
      });
      input.dispatchEvent(event);
      expect(state.givers.length).toBe(1);
      expect(state.givers[0].name).toBe("Alex");
    });

    it('does nothing when input is empty', () => {
      click("#b0");
      expect(state.givers.length).toBe(0);
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

    it('removes giver from state when delete is clicked', () => {
      enterName("Alex");
      const deleteBtn = document.querySelector("#participants [id^='delete-Alex']");
      click(`#${deleteBtn.id}`);
      expect(state.givers.length).toBe(0);
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
      expect(state.houses["house-0"]).toContain("Alex");
      const deleteBtn = document.querySelector("[id^='delete-Alex']");
      click(`#${deleteBtn.id}`);
      expect(state.houses["house-0"]).not.toContain("Alex");
    });
  });
});
