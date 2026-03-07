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
  loadExchange,
  nextStep,
  removeParticipant,
  removeHouseFromState,
  removeNameFromHouse,
  renameHouse,
  isGenerated
} from '/src/state.js'
import {alex, whitney, hunter} from "./testData";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from '/src/state.js'
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
  expect(state.assignments).toEqual([]);
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

  describe('renameHouse', () => {
    it('should update house name', () => {
      addHouseToState("house-0");
      renameHouse("house-0", "Smith Family");
      expect(state.houses[0].name).toBe("Smith Family");
    });

    it('should emit HOUSE_RENAMED event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.HOUSE_RENAMED, spy);
      addHouseToState("house-0");
      renameHouse("house-0", "Smith Family");
      expect(spy).toHaveBeenCalledWith({houseID: "house-0", name: "Smith Family"});
      unsubscribe();
    });

    it('should not throw for non-existent house', () => {
      expect(() => renameHouse("house-99", "Test")).not.toThrow();
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
    it('populates state.assignments array', () => {
      installParticipantNames("Alex", "Whitney", "Hunter");
      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(state.assignments).toEqual([
        {giver: "Alex", recipient: "Whitney"},
        {giver: "Whitney", recipient: "Hunter"},
        {giver: "Hunter", recipient: "Alex"}
      ]);
    });

    it('emits RECIPIENTS_ASSIGNED event with assignments', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.RECIPIENTS_ASSIGNED, spy);
      installParticipantNames("Alex", "Whitney", "Hunter");
      state.isSecretSanta = false;

      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(spy).toHaveBeenCalledWith({
        isGenerated: true,
        isSecretSanta: false,
        assignments: [
          {giver: "Alex", recipient: "Whitney"},
          {giver: "Whitney", recipient: "Hunter"},
          {giver: "Hunter", recipient: "Alex"}
        ]
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
        isGenerated: true,
        isSecretSanta: true,
        assignments: state.assignments,
      });

      unsubscribe();
    });
  });

  describe('isGenerated', () => {
    it('returns false when assignments is empty', () => {
      expect(isGenerated()).toBe(false);
    });

    it('returns true when assignments has entries', () => {
      installParticipantNames("Alex", "Whitney");
      assignRecipients(["Whitney", "Alex"]);
      expect(isGenerated()).toBe(true);
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

  describe('loadExchange', () => {
    const exchangeData = {
      isSecretSanta: true,
      houses: [
        {name: "Smith Family", members: ["Alex", "Whitney"]},
        {name: "Jones Family", members: ["Hunter"]}
      ],
      participants: [
        {name: "Alex", email: "alex@gmail.com"},
        {name: "Whitney", email: "whitney@gmail.com"},
        {name: "Hunter", email: "hunter@gmail.com"}
      ]
    };

    it('populates participants from exchange data', () => {
      loadExchange(exchangeData);

      expect(state.participants).toHaveLength(3);
      expect(state.participants[0].name).toBe("Alex");
      expect(state.participants[1].name).toBe("Whitney");
      expect(state.participants[2].name).toBe("Hunter");
    });

    it('sets participant emails from exchange data', () => {
      loadExchange(exchangeData);

      expect(state.participants[0].email).toBe("alex@gmail.com");
      expect(state.participants[1].email).toBe("whitney@gmail.com");
      expect(state.participants[2].email).toBe("hunter@gmail.com");
    });

    it('populates houses with names and members', () => {
      loadExchange(exchangeData);

      expect(state.houses).toHaveLength(2);
      expect(state.houses[0].name).toBe("Smith Family");
      expect(state.houses[0].members).toEqual(["Alex", "Whitney"]);
      expect(state.houses[1].name).toBe("Jones Family");
      expect(state.houses[1].members).toEqual(["Hunter"]);
    });

    it('sets isSecretSanta from exchange data', () => {
      loadExchange(exchangeData);

      expect(state.isSecretSanta).toBe(true);
    });

    it('generates a new exchangeId', () => {
      loadExchange(exchangeData);

      expect(state.exchangeId).toBeDefined();
      expect(state.exchangeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('sets assignments to empty array', () => {
      loadExchange(exchangeData);

      expect(state.assignments).toEqual([]);
    });

    it('initializes nameNumber to 1', () => {
      loadExchange(exchangeData);

      expect(state.nameNumber).toBe(1);
    });

    it('emits EXCHANGE_STARTED event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.EXCHANGE_STARTED, spy);

      loadExchange(exchangeData);

      expect(spy).toHaveBeenCalled();
      unsubscribe();
    });

    it('emits PARTICIPANT_ADDED for each participant', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.PARTICIPANT_ADDED, spy);

      loadExchange(exchangeData);

      expect(spy).toHaveBeenCalledTimes(3);
      unsubscribe();
    });

    it('emits HOUSE_ADDED for each house', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.HOUSE_ADDED, spy);

      loadExchange(exchangeData);

      expect(spy).toHaveBeenCalledTimes(2);
      unsubscribe();
    });

    it('handles exchange data with no houses', () => {
      const noHousesData = {
        isSecretSanta: false,
        houses: [],
        participants: [
          {name: "Alex", email: "alex@gmail.com"},
          {name: "Whitney", email: "whitney@gmail.com"}
        ]
      };

      loadExchange(noHousesData);

      expect(state.participants).toHaveLength(2);
      expect(state.houses).toHaveLength(0);
      expect(state.isSecretSanta).toBe(false);
    });
  });
});
