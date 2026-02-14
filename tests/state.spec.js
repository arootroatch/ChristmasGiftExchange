import {beforeEach, describe, expect, it, test, vi} from 'vitest'
import {
  state,
  startExchange,
  addGiver,
  addHouseToState,
  addNameToHouse,
  addEmailsToGivers,
  assignRecipients,
  getHousesArray,
  getHousesForGeneration,
  getIndividualParticipants,
  nextStep,
  removeGiver,
  removeHouseFromState,
  removeNameFromHouse
} from '/src/js/state.js'
import {alex, whitney, hunter} from "./testData";
import {Events, stateEvents} from '/src/js/Events.js'
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
      {...alex},
      {...whitney},
      {...hunter}
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
      state.houses = {"house-0": ["Alex"], "house-1": ["Whitney"]};
      removeHouseFromState("house-0");
      expect(state.houses["house-0"]).toBeUndefined();
      expect(state.houses["house-1"]).toEqual(["Whitney"]);
    });

    it('should handle removing non-existent house', () => {
      state.houses = {"house-0": ["Alex"]};
      expect(() => removeHouseFromState("house-99")).not.toThrow();
      expect(state.houses["house-0"]).toEqual(["Alex"]);
    });
  });

  describe('addNameToHouse', () => {
    it('should add name to existing house', () => {
      state.houses["house-0"] = [];
      addNameToHouse("house-0", "Alex");
      expect(state.houses["house-0"]).toEqual(["Alex"]);
    });

    it('should create house if it does not exist', () => {
      addNameToHouse("house-0", "Alex");
      expect(state.houses["house-0"]).toEqual(["Alex"]);
    });

    it('should not add duplicate names', () => {
      state.houses["house-0"] = ["Alex"];
      addNameToHouse("house-0", "Alex");
      expect(state.houses["house-0"]).toEqual(["Alex"]);
    });

    it('should add multiple names to same house', () => {
      state.houses["house-0"] = [];
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-0", "Whitney");
      expect(state.houses["house-0"]).toEqual(["Alex", "Whitney"]);
    });
  });

  describe('removeNameFromHouse', () => {
    it('should remove name from house', () => {
      state.houses["house-0"] = ["Alex", "Whitney"];
      removeNameFromHouse("house-0", "Alex");
      expect(state.houses["house-0"]).toEqual(["Whitney"]);
    });

    it('should handle non-existent house', () => {
      expect(() => removeNameFromHouse("house-99", "Alex")).not.toThrow();
    });

    it('should handle non-existent name', () => {
      state.houses["house-0"] = ["Alex"];
      removeNameFromHouse("house-0", "Whitney");
      expect(state.houses["house-0"]).toEqual(["Alex"]);
    });
  });

  describe('addGiver', () => {
    it('should add a giver to state', () => {
      state.givers = [];
      addGiver("Alex");
      expect(state.givers.length).toBe(1);
      expect(state.givers[0].name).toBe("Alex");
    });
  });

  describe('removeGiver', () => {
    it('should remove giver from state', () => {
      removeGiver("Whitney");
      expect(state.givers.map(g => g.name)).toEqual(["Alex", "Hunter"]);
    });

    it('should remove giver from house before removing from state', () => {
      state.houses = {"house-0": ["Alex", "Whitney"]};
      removeGiver("Alex");
      expect(state.houses["house-0"]).toEqual(["Whitney"]);
      expect(state.givers.map(g => g.name)).toEqual(["Whitney", "Hunter"]);
    });

    it('should handle giver not in any house', () => {
      state.houses = {"house-0": ["Whitney"]};
      removeGiver("Alex");
      expect(state.houses["house-0"]).toEqual(["Whitney"]);
      expect(state.givers.map(g => g.name)).toEqual(["Whitney", "Hunter"]);
    });
  });

  describe('getHousesArray', () => {
    it('should return array of house arrays', () => {
      state.houses = {"house-0": ["Alex"], "house-1": ["Whitney", "Hunter"]};
      expect(getHousesArray()).toEqual([["Alex"], ["Whitney", "Hunter"]]);
    });

    it('should filter out empty houses', () => {
      state.houses = {"house-0": ["Alex"], "house-1": [], "house-2": ["Whitney"]};
      expect(getHousesArray()).toEqual([["Alex"], ["Whitney"]]);
    });

    it('should handle empty state.houses object', () => {
      state.houses = {};
      expect(getHousesArray()).toEqual([]);
    });
  });

  describe('getIndividualParticipants', () => {
    it('should return individuals not in any house', () => {
      state.houses = {"house-0": ["Alex"]};
      expect(getIndividualParticipants()).toEqual([["Whitney"], ["Hunter"]]);
    });

    it('should return all givers if no houses', () => {
      state.houses = {};
      expect(getIndividualParticipants()).toEqual([["Alex"], ["Whitney"], ["Hunter"]]);
    });

    it('should return empty array if all givers are in houses', () => {
      state.houses = {"house-0": ["Alex", "Whitney", "Hunter"]};
      expect(getIndividualParticipants()).toEqual([]);
    });
  });

  describe('assignRecipients', () => {
    it('updates givers with recipients', () => {
      installGiverNames("Alex", "Whitney", "Hunter");
      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(state.givers[0].recipient).toBe("Whitney");
      expect(state.givers[1].recipient).toBe("Hunter");
      expect(state.givers[2].recipient).toBe("Alex");
    });

    it('emits RECIPIENTS_ASSIGNED event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.RECIPIENTS_ASSIGNED, spy);
      installGiverNames("Alex", "Whitney", "Hunter");
      state.isSecretSanta = false;

      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(spy).toHaveBeenCalledWith({
        isGenerated: true, isSecretSanta: false, givers: state.givers
      });

      unsubscribe();
    });

    it('includes current isSecretSanta value in emitted event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.RECIPIENTS_ASSIGNED, spy);
      installGiverNames("Alex", "Whitney", "Hunter");
      state.isSecretSanta = true;

      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(spy).toHaveBeenCalledWith({
        isGenerated: true, isSecretSanta: true, givers: state.givers,
      });

      unsubscribe();
    });
  });

  describe('getHousesForGeneration', () => {
    it('should combine houses and individuals', () => {
      state.houses = {"house-0": ["Alex", "Whitney"]};
      expect(getHousesForGeneration()).toEqual([["Alex", "Whitney"], ["Hunter"]]);
    });

    it('should filter empty houses', () => {
      state.houses = {"house-0": ["Alex"], "house-1": [], "house-2": ["Whitney"]};
      expect(getHousesForGeneration()).toEqual([["Alex"], ["Whitney"], ["Hunter"]]);
    });

    it('should return only individuals when no houses exist', () => {
      state.houses = {};
      expect(getHousesForGeneration()).toEqual([["Alex"], ["Whitney"], ["Hunter"]]);
    });

    it('should return only houses when all givers are in houses', () => {
      state.houses = {"house-0": ["Alex", "Whitney"], "house-1": ["Hunter"]};
      expect(getHousesForGeneration()).toEqual([["Alex", "Whitney"], ["Hunter"]]);
    });
  });

  describe('nextStep', () => {
    it('increments step and emits NEXT_STEP', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.NEXT_STEP, spy);

      nextStep();

      expect(state.step).toBe(2);
      expect(spy).toHaveBeenCalledWith({step: 2});
      unsubscribe();
    });

    it('wraps to 0 when maxSteps is provided', () => {
      state.step = 3;
      nextStep(3);
      expect(state.step).toBe(0);
    });
  });

  describe('addEmailsToGivers', () => {
    let mockDate;
    let randomSpy;

    beforeEach(() => {
      state.givers = [];
      installGiverNames("Alex", "Whitney", "Hunter");
      mockDate = new Date('2026-02-13T12:00:00.000Z');
      vi.setSystemTime(mockDate);
      randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    });

    it('should set email on each giver by index', () => {
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0},
        {name: "Whitney", email: "whitney@example.com", index: 1}
      ];

      addEmailsToGivers(emails);

      expect(state.givers[0].email).toBe("alex@example.com");
      expect(state.givers[1].email).toBe("whitney@example.com");
      expect(state.givers[2].email).toBe("");
    });

    it('should set date on each giver', () => {
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0}
      ];

      addEmailsToGivers(emails);

      expect(state.givers[0].date).toBe("2026-02-13T12:00:00.000Z");
    });

    it('should generate unique id with format giverCount_random_date', () => {
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0}
      ];

      addEmailsToGivers(emails);

      const expectedId = `3_${Math.random().toString(20)}_${mockDate.toISOString()}`;
      expect(state.givers[0].id).toBe(expectedId);
    });

    it('should handle multiple emails at once', () => {
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0},
        {name: "Whitney", email: "whitney@example.com", index: 1},
        {name: "Hunter", email: "hunter@example.com", index: 2}
      ];

      addEmailsToGivers(emails);

      expect(state.givers[0].email).toBe("alex@example.com");
      expect(state.givers[1].email).toBe("whitney@example.com");
      expect(state.givers[2].email).toBe("hunter@example.com");

      state.givers.forEach(giver => {
        expect(giver.date).toBe("2026-02-13T12:00:00.000Z");
        expect(giver.id).toContain("3_");
      });
    });

    it('should emit EMAILS_ADDED event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.EMAILS_ADDED, spy);
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0}
      ];

      addEmailsToGivers(emails);

      expect(spy).toHaveBeenCalledWith({givers: state.givers});
      unsubscribe();
    });

    it('should handle empty emails array', () => {
      const originalGivers = [...state.givers];

      addEmailsToGivers([]);

      expect(state.givers).toEqual(originalGivers);
    });
  });
});
