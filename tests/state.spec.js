import { describe, beforeEach, expect, it, test, vi } from 'vitest'
import state, {
  addHouseToState,
  removeHouseFromState,
  addNameToHouse,
  removeNameFromHouse,
  getHousesArray,
  getIndividualParticipants,
  getHousesForGeneration,
  setIsGenerated,
  Giver
} from '/resources/js/state.js'
import { stateEvents, Events } from '/resources/js/events.js'

test('initial state', () => {
    expect(state.houses).toEqual({});
    expect(state.isGenerated).toEqual(false);
    expect(state.introIndex).toEqual(0);
    expect(state.isSecretSanta).toEqual(false);
    expect(state.givers).toEqual([]);
    expect(state.nameNumber).toEqual(1);
})

describe('state helper functions', () => {
  beforeEach(() => {
    state.houses = {};
    state.givers = [
      new Giver("Alice"),
      new Giver("Bob"),
      new Giver("Charlie")
    ];
  });

  describe('addHouseToState', () => {
    it('should add empty array with given ID', () => {
      addHouseToState("house-0");
      expect(state.houses["house-0"]).toEqual([]);
    });

    it('should add multiple houses with different IDs', () => {
      addHouseToState("house-0");
      addHouseToState("house-5");
      expect(state.houses["house-0"]).toEqual([]);
      expect(state.houses["house-5"]).toEqual([]);
    });
  });

  describe('removeHouseFromState', () => {
    it('should remove house by ID', () => {
      state.houses = {"house-0": ["Alice"], "house-1": ["Bob"]};
      removeHouseFromState("house-0");
      expect(state.houses["house-0"]).toBeUndefined();
      expect(state.houses["house-1"]).toEqual(["Bob"]);
    });

    it('should handle removing non-existent house', () => {
      state.houses = {"house-0": ["Alice"]};
      expect(() => removeHouseFromState("house-99")).not.toThrow();
      expect(state.houses["house-0"]).toEqual(["Alice"]);
    });
  });

  describe('addNameToHouse', () => {
    it('should add name to existing house', () => {
      state.houses["house-0"] = [];
      addNameToHouse("house-0", "Alice");
      expect(state.houses["house-0"]).toEqual(["Alice"]);
    });

    it('should create house if it does not exist', () => {
      addNameToHouse("house-0", "Alice");
      expect(state.houses["house-0"]).toEqual(["Alice"]);
    });

    it('should not add duplicate names', () => {
      state.houses["house-0"] = ["Alice"];
      addNameToHouse("house-0", "Alice");
      expect(state.houses["house-0"]).toEqual(["Alice"]);
    });

    it('should add multiple names to same house', () => {
      state.houses["house-0"] = [];
      addNameToHouse("house-0", "Alice");
      addNameToHouse("house-0", "Bob");
      expect(state.houses["house-0"]).toEqual(["Alice", "Bob"]);
    });
  });

  describe('removeNameFromHouse', () => {
    it('should remove name from house', () => {
      state.houses["house-0"] = ["Alice", "Bob"];
      removeNameFromHouse("house-0", "Alice");
      expect(state.houses["house-0"]).toEqual(["Bob"]);
    });

    it('should handle non-existent house', () => {
      expect(() => removeNameFromHouse("house-99", "Alice")).not.toThrow();
    });

    it('should handle non-existent name', () => {
      state.houses["house-0"] = ["Alice"];
      removeNameFromHouse("house-0", "Bob");
      expect(state.houses["house-0"]).toEqual(["Alice"]);
    });
  });

  describe('getHousesArray', () => {
    it('should return array of house arrays', () => {
      state.houses = {"house-0": ["Alice"], "house-1": ["Bob", "Charlie"]};
      expect(getHousesArray()).toEqual([["Alice"], ["Bob", "Charlie"]]);
    });

    it('should filter out empty houses', () => {
      state.houses = {"house-0": ["Alice"], "house-1": [], "house-2": ["Bob"]};
      expect(getHousesArray()).toEqual([["Alice"], ["Bob"]]);
    });

    it('should handle empty state.houses object', () => {
      state.houses = {};
      expect(getHousesArray()).toEqual([]);
    });
  });

  describe('getIndividualParticipants', () => {
    it('should return individuals not in any house', () => {
      state.houses = {"house-0": ["Alice"]};
      expect(getIndividualParticipants()).toEqual([["Bob"], ["Charlie"]]);
    });

    it('should return all givers if no houses', () => {
      state.houses = {};
      expect(getIndividualParticipants()).toEqual([["Alice"], ["Bob"], ["Charlie"]]);
    });

    it('should return empty array if all givers are in houses', () => {
      state.houses = {"house-0": ["Alice", "Bob", "Charlie"]};
      expect(getIndividualParticipants()).toEqual([]);
    });
  });

  describe('setIsGenerated', () => {
    it('sets state.isGenerated to true', () => {
      state.isGenerated = false;
      setIsGenerated(true);
      expect(state.isGenerated).toBe(true);
    });

    it('sets state.isGenerated to false', () => {
      state.isGenerated = true;
      setIsGenerated(false);
      expect(state.isGenerated).toBe(false);
    });

    it('emits COMPONENT_UPDATED event with resultsTable type', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.COMPONENT_UPDATED, spy);

      state.isSecretSanta = false;
      setIsGenerated(true);

      expect(spy).toHaveBeenCalledWith({
        type: 'resultsTable',
        id: 'main',
        data: { isGenerated: true, isSecretSanta: false }
      });

      unsubscribe();
    });

    it('includes current isSecretSanta value in emitted event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.COMPONENT_UPDATED, spy);

      state.isSecretSanta = true;
      setIsGenerated(true);

      expect(spy).toHaveBeenCalledWith({
        type: 'resultsTable',
        id: 'main',
        data: { isGenerated: true, isSecretSanta: true }
      });

      unsubscribe();
    });
  });

  describe('getHousesForGeneration', () => {
    it('should combine houses and individuals', () => {
      state.houses = {"house-0": ["Alice", "Bob"]};
      expect(getHousesForGeneration()).toEqual([["Alice", "Bob"], ["Charlie"]]);
    });

    it('should filter empty houses', () => {
      state.houses = {"house-0": ["Alice"], "house-1": [], "house-2": ["Bob"]};
      expect(getHousesForGeneration()).toEqual([["Alice"], ["Bob"], ["Charlie"]]);
    });

    it('should return only individuals when no houses exist', () => {
      state.houses = {};
      expect(getHousesForGeneration()).toEqual([["Alice"], ["Bob"], ["Charlie"]]);
    });

    it('should return only houses when all givers are in houses', () => {
      state.houses = {"house-0": ["Alice", "Bob"], "house-1": ["Charlie"]};
      expect(getHousesForGeneration()).toEqual([["Alice", "Bob"], ["Charlie"]]);
    });
  });
});