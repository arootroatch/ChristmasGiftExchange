import {beforeEach, describe, expect, it, test, vi} from 'vitest'
import {
  state,
  startExchange,
  addParticipant,
  addHouseToState,
  addNameToHouse,
  addEmailsToParticipants,
  assignRecipients,
  getHousesArray,
  getHousesForGeneration,
  getIndividualParticipants,
  nextStep,
  removeParticipant,
  removeHouseFromState,
  removeNameFromHouse
} from '/src/state.js'
import {alex, whitney, hunter} from "./testData";
import {Events, stateEvents} from '/src/Events.js'
import {installParticipantNames} from "./specHelper";

test('state is undefined before exchange starts', () => {
  expect(state).toBeUndefined();
})

test('startExchange initializes state', () => {
  startExchange();
  expect(state.houses).toEqual([]);
  expect(state.step).toEqual(1);
  expect(state.isSecretSanta).toEqual(false);
  expect(state.participants).toEqual([]);
  expect(state.nameNumber).toEqual(1);
})

describe('exchangeId', () => {
  it('generates a UUID when exchange starts', () => {
    startExchange();
    expect(state.exchangeId).toBeDefined();
    expect(state.exchangeId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('generates a different UUID each time', () => {
    startExchange();
    const first = state.exchangeId;
    startExchange();
    expect(state.exchangeId).not.toBe(first);
  });
});

describe('state helper functions', () => {
  beforeEach(() => {
    startExchange();
    state.participants = [
      {...alex},
      {...whitney},
      {...hunter}
    ];
  });

  describe('addHouseToState', () => {
    it('should add house object with id, name, and empty members', () => {
      addHouseToState("house-0");
      expect(state.houses).toEqual([
        {id: "house-0", name: "Group 1", members: []}
      ]);
    });

    it('should assign incrementing display names', () => {
      addHouseToState("house-0");
      addHouseToState("house-5");
      expect(state.houses[0].name).toBe("Group 1");
      expect(state.houses[1].name).toBe("Group 2");
    });
  });

  describe('removeHouseFromState', () => {
    it('should remove house by ID', () => {
      addHouseToState("house-0");
      addHouseToState("house-1");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-1", "Whitney");
      removeHouseFromState("house-0");
      expect(state.houses.find(h => h.id === "house-0")).toBeUndefined();
      expect(state.houses.find(h => h.id === "house-1").members).toEqual(["Whitney"]);
    });

    it('should handle removing non-existent house', () => {
      addHouseToState("house-0");
      expect(() => removeHouseFromState("house-99")).not.toThrow();
      expect(state.houses.length).toBe(1);
    });
  });

  describe('addNameToHouse', () => {
    it('should add name to existing house', () => {
      addHouseToState("house-0");
      addNameToHouse("house-0", "Alex");
      expect(state.houses[0].members).toEqual(["Alex"]);
    });

    it('should not add duplicate names', () => {
      addHouseToState("house-0");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-0", "Alex");
      expect(state.houses[0].members).toEqual(["Alex"]);
    });

    it('should add multiple names to same house', () => {
      addHouseToState("house-0");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-0", "Whitney");
      expect(state.houses[0].members).toEqual(["Alex", "Whitney"]);
    });
  });

  describe('removeNameFromHouse', () => {
    it('should remove name from house', () => {
      addHouseToState("house-0");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-0", "Whitney");
      removeNameFromHouse("house-0", "Alex");
      expect(state.houses[0].members).toEqual(["Whitney"]);
    });

    it('should handle non-existent house', () => {
      expect(() => removeNameFromHouse("house-99", "Alex")).not.toThrow();
    });

    it('should handle non-existent name', () => {
      addHouseToState("house-0");
      addNameToHouse("house-0", "Alex");
      removeNameFromHouse("house-0", "Whitney");
      expect(state.houses[0].members).toEqual(["Alex"]);
    });
  });

  describe('addParticipant', () => {
    it('should add a participant to state', () => {
      state.participants = [];
      addParticipant("Alex");
      expect(state.participants.length).toBe(1);
      expect(state.participants[0].name).toBe("Alex");
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant from state', () => {
      removeParticipant("Whitney");
      expect(state.participants.map(p => p.name)).toEqual(["Alex", "Hunter"]);
    });

    it('should remove participant from house before removing from state', () => {
      addHouseToState("house-0");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-0", "Whitney");
      removeParticipant("Alex");
      expect(state.houses[0].members).toEqual(["Whitney"]);
      expect(state.participants.map(p => p.name)).toEqual(["Whitney", "Hunter"]);
    });

    it('should handle participant not in any house', () => {
      addHouseToState("house-0");
      addNameToHouse("house-0", "Whitney");
      removeParticipant("Alex");
      expect(state.houses[0].members).toEqual(["Whitney"]);
      expect(state.participants.map(p => p.name)).toEqual(["Whitney", "Hunter"]);
    });
  });

  describe('getHousesArray', () => {
    it('should return array of member arrays', () => {
      addHouseToState("house-0");
      addHouseToState("house-1");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-1", "Whitney");
      addNameToHouse("house-1", "Hunter");
      expect(getHousesArray()).toEqual([["Alex"], ["Whitney", "Hunter"]]);
    });

    it('should filter out empty houses', () => {
      addHouseToState("house-0");
      addHouseToState("house-1");
      addHouseToState("house-2");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-2", "Whitney");
      expect(getHousesArray()).toEqual([["Alex"], ["Whitney"]]);
    });

    it('should handle empty state.houses array', () => {
      state.houses = [];
      expect(getHousesArray()).toEqual([]);
    });
  });

  describe('getIndividualParticipants', () => {
    it('should return individuals not in any house', () => {
      addHouseToState("house-0");
      addNameToHouse("house-0", "Alex");
      expect(getIndividualParticipants()).toEqual([["Whitney"], ["Hunter"]]);
    });

    it('should return all participants if no houses', () => {
      state.houses = [];
      expect(getIndividualParticipants()).toEqual([["Alex"], ["Whitney"], ["Hunter"]]);
    });

    it('should return empty array if all participants are in houses', () => {
      addHouseToState("house-0");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-0", "Whitney");
      addNameToHouse("house-0", "Hunter");
      expect(getIndividualParticipants()).toEqual([]);
    });
  });

  describe('assignRecipients', () => {
    it('updates participants with recipients', () => {
      installParticipantNames("Alex", "Whitney", "Hunter");
      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(state.participants[0].recipient).toBe("Whitney");
      expect(state.participants[1].recipient).toBe("Hunter");
      expect(state.participants[2].recipient).toBe("Alex");
    });

    it('emits RECIPIENTS_ASSIGNED event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.RECIPIENTS_ASSIGNED, spy);
      installParticipantNames("Alex", "Whitney", "Hunter");
      state.isSecretSanta = false;

      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(spy).toHaveBeenCalledWith({
        isGenerated: true, isSecretSanta: false, participants: state.participants
      });

      unsubscribe();
    });

    it('includes current isSecretSanta value in emitted event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.RECIPIENTS_ASSIGNED, spy);
      installParticipantNames("Alex", "Whitney", "Hunter");
      state.isSecretSanta = true;

      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(spy).toHaveBeenCalledWith({
        isGenerated: true, isSecretSanta: true, participants: state.participants,
      });

      unsubscribe();
    });
  });

  describe('getHousesForGeneration', () => {
    it('should combine houses and individuals', () => {
      addHouseToState("house-0");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-0", "Whitney");
      expect(getHousesForGeneration()).toEqual([["Alex", "Whitney"], ["Hunter"]]);
    });

    it('should filter empty houses', () => {
      addHouseToState("house-0");
      addHouseToState("house-1");
      addHouseToState("house-2");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-2", "Whitney");
      expect(getHousesForGeneration()).toEqual([["Alex"], ["Whitney"], ["Hunter"]]);
    });

    it('should return only individuals when no houses exist', () => {
      state.houses = [];
      expect(getHousesForGeneration()).toEqual([["Alex"], ["Whitney"], ["Hunter"]]);
    });

    it('should return only houses when all participants are in houses', () => {
      addHouseToState("house-0");
      addHouseToState("house-1");
      addNameToHouse("house-0", "Alex");
      addNameToHouse("house-0", "Whitney");
      addNameToHouse("house-1", "Hunter");
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

  describe('addEmailsToParticipants', () => {
    beforeEach(() => {
      state.participants = [];
      installParticipantNames("Alex", "Whitney", "Hunter");
    });

    it('should set email on each participant by index', () => {
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0},
        {name: "Whitney", email: "whitney@example.com", index: 1}
      ];

      addEmailsToParticipants(emails);

      expect(state.participants[0].email).toBe("alex@example.com");
      expect(state.participants[1].email).toBe("whitney@example.com");
      expect(state.participants[2].email).toBe("");
    });

    it('should handle multiple emails at once', () => {
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0},
        {name: "Whitney", email: "whitney@example.com", index: 1},
        {name: "Hunter", email: "hunter@example.com", index: 2}
      ];

      addEmailsToParticipants(emails);

      expect(state.participants[0].email).toBe("alex@example.com");
      expect(state.participants[1].email).toBe("whitney@example.com");
      expect(state.participants[2].email).toBe("hunter@example.com");
    });

    it('should emit EMAILS_ADDED event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.EMAILS_ADDED, spy);
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0}
      ];

      addEmailsToParticipants(emails);

      expect(spy).toHaveBeenCalledWith({participants: state.participants});
      unsubscribe();
    });

    it('should handle empty emails array', () => {
      const originalParticipants = [...state.participants];

      addEmailsToParticipants([]);

      expect(state.participants).toEqual(originalParticipants);
    });
  });
});
