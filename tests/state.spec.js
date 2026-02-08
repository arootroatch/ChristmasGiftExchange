import {beforeEach, describe, expect, it, test, vi} from 'vitest'
import {
  state,
  startExchange,
  addGiver,
  addHouseToState,
  addNameToHouse,
  assignRecipients,
  getHousesArray,
  getHousesForGeneration,
  getIndividualParticipants,
  Giver,
  removeGiver,
  removeHouseFromState,
  removeNameFromHouse
} from '/resources/js/state.js'
import {Events, stateEvents} from '/resources/js/events.js'
import {installGiverNames} from "./specHelper";

test('state is undefined before exchange starts', () => {
  expect(state).toBeUndefined();
})

test('startExchange initializes state', () => {
  startExchange();
  expect(state.houses).toEqual({});
  expect(state.step).toEqual(1);
  expect(state.isSecretSanta).toEqual(false);
  expect(state.givers).toEqual([]);
  expect(state.nameNumber).toEqual(1);
})

describe('state helper functions', () => {
  beforeEach(() => {
    startExchange();
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

  describe('addGiver', () => {
    it('should add a giver to state', () => {
      state.givers = [];
      addGiver("Alice");
      expect(state.givers.length).toBe(1);
      expect(state.givers[0].name).toBe("Alice");
    });
  });

  describe('removeGiver', () => {
    it('should remove giver from state', () => {
      removeGiver("Bob");
      expect(state.givers.map(g => g.name)).toEqual(["Alice", "Charlie"]);
    });

    it('should remove giver from house before removing from state', () => {
      state.houses = {"house-0": ["Alice", "Bob"]};
      removeGiver("Alice");
      expect(state.houses["house-0"]).toEqual(["Bob"]);
      expect(state.givers.map(g => g.name)).toEqual(["Bob", "Charlie"]);
    });

    it('should handle giver not in any house', () => {
      state.houses = {"house-0": ["Bob"]};
      removeGiver("Alice");
      expect(state.houses["house-0"]).toEqual(["Bob"]);
      expect(state.givers.map(g => g.name)).toEqual(["Bob", "Charlie"]);
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

  describe('assignRecipients', () => {
    it('updates givers with recipients', () => {
      installGiverNames("Alice", "Whitney", "Bob");
      assignRecipients(["Whitney", "Bob", "Alice"]);

      expect(state.givers[0].recipient).toBe("Whitney");
      expect(state.givers[1].recipient).toBe("Bob");
      expect(state.givers[2].recipient).toBe("Alice");
    });

    it('emits RECIPIENTS_ASSIGNED event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.RECIPIENTS_ASSIGNED, spy);
      installGiverNames("Alice", "Whitney", "Bob");
      state.isSecretSanta = false;

      assignRecipients(["Whitney", "Bob", "Alice"]);

      expect(spy).toHaveBeenCalledWith({
        isGenerated: true, isSecretSanta: false, givers: state.givers
      });

      unsubscribe();
    });

    it('includes current isSecretSanta value in emitted event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.RECIPIENTS_ASSIGNED, spy);
      installGiverNames("Alice", "Whitney", "Bob");
      state.isSecretSanta = true;

      assignRecipients(["Whitney", "Bob", "Alice"]);

      expect(spy).toHaveBeenCalledWith({
        isGenerated: true, isSecretSanta: true, givers: state.givers,
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