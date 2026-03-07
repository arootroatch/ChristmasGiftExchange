import {beforeEach, describe, expect, it, test, vi} from 'vitest'
import {
  getState,
  startExchange,
  addParticipant,
  addHouseToState,
  addNameToHouse,
  addEmailsToParticipants,
  assignRecipients,
  getHousesArray,
  getExchangePayload,
  getHousesForGeneration,
  getIndividualParticipants,
  getParticipantNames,
  loadExchange,
  nextStep,
  removeParticipant,
  removeHouseFromState,
  removeNameFromHouse,
  renameHouse,
  isGenerated
} from '/src/exchange/state.js'
import {alex, whitney, hunter} from "./testData";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from '/src/exchange/state.js'
import {installParticipantNames} from "./specHelper";

test('state exists as an object before exchange starts', () => {
  expect(getState()).toBeDefined();
  expect(typeof getState()).toBe('object');
})

test('startExchange initializes state', () => {
  startExchange();
  expect(getState().houses).toEqual([]);
  expect(getState().step).toEqual(1);
  expect(getState().isSecretSanta).toEqual(false);
  expect(getState().participants).toEqual([]);
  expect(getState().assignments).toEqual([]);
  expect(getState().nameNumber).toEqual(1);
})

describe('exchangeId', () => {
  it('generates a UUID when exchange starts', () => {
    startExchange();
    expect(getState().exchangeId).toBeDefined();
    expect(getState().exchangeId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('generates a different UUID each time', () => {
    startExchange();
    const first = getState().exchangeId;
    startExchange();
    expect(getState().exchangeId).not.toBe(first);
  });
});

describe('state helper functions', () => {
  beforeEach(() => {
    startExchange();
    getState().participants = [
      {...alex},
      {...whitney},
      {...hunter}
    ];
  });

  describe('addHouseToState', () => {
    it('should add house object with generated id, name, and empty members', () => {
      addHouseToState();
      expect(getState().houses.length).toBe(1);
      expect(getState().houses[0].id).toMatch(/^house-/);
      expect(getState().houses[0].name).toBe("Group 1");
      expect(getState().houses[0].members).toEqual([]);
    });

    it('should assign incrementing display names', () => {
      addHouseToState();
      addHouseToState();
      expect(getState().houses[0].name).toBe("Group 1");
      expect(getState().houses[1].name).toBe("Group 2");
    });

    it('returns the generated houseID', () => {
      const houseID = addHouseToState();
      expect(houseID).toBe(getState().houses[0].id);
    });
  });

  describe('removeHouseFromState', () => {
    it('should remove house by ID', () => {
      const id0 = addHouseToState();
      const id1 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id1, "Whitney");
      removeHouseFromState(id0);
      expect(getState().houses.find(h => h.id === id0)).toBeUndefined();
      expect(getState().houses.find(h => h.id === id1).members).toEqual(["Whitney"]);
    });

    it('should remove all members from house before removing', () => {
      const id0 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id0, "Whitney");

      const removeSpy = vi.fn();
      const unsubscribe = stateEvents.on(Events.NAME_REMOVED_FROM_HOUSE, removeSpy);

      removeHouseFromState(id0);

      expect(removeSpy).toHaveBeenCalledTimes(2);
      unsubscribe();
    });

    it('should handle removing non-existent house', () => {
      addHouseToState();
      expect(() => removeHouseFromState("house-99")).not.toThrow();
      expect(getState().houses.length).toBe(1);
    });
  });

  describe('addNameToHouse', () => {
    it('should add name to existing house', () => {
      const id0 = addHouseToState();
      addNameToHouse(id0, "Alex");
      expect(getState().houses[0].members).toEqual(["Alex"]);
    });

    it('should not add duplicate names', () => {
      const id0 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id0, "Alex");
      expect(getState().houses[0].members).toEqual(["Alex"]);
    });

    it('should add multiple names to same house', () => {
      const id0 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id0, "Whitney");
      expect(getState().houses[0].members).toEqual(["Alex", "Whitney"]);
    });
  });

  describe('removeNameFromHouse', () => {
    it('should remove name from house', () => {
      const id0 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id0, "Whitney");
      removeNameFromHouse(id0, "Alex");
      expect(getState().houses[0].members).toEqual(["Whitney"]);
    });

    it('should handle non-existent house', () => {
      expect(() => removeNameFromHouse("house-99", "Alex")).not.toThrow();
    });

    it('should handle non-existent name', () => {
      const id0 = addHouseToState();
      addNameToHouse(id0, "Alex");
      removeNameFromHouse(id0, "Whitney");
      expect(getState().houses[0].members).toEqual(["Alex"]);
    });
  });

  describe('renameHouse', () => {
    it('should update house name', () => {
      const id0 = addHouseToState();
      renameHouse(id0, "Smith Family");
      expect(getState().houses[0].name).toBe("Smith Family");
    });

    it('should emit HOUSE_RENAMED event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.HOUSE_RENAMED, spy);
      const id0 = addHouseToState();
      renameHouse(id0, "Smith Family");
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({houseID: id0, name: "Smith Family"}));
      unsubscribe();
    });

    it('should not throw for non-existent house', () => {
      expect(() => renameHouse("house-99", "Test")).not.toThrow();
    });
  });

  describe('addParticipant', () => {
    it('should add a participant to state', () => {
      getState().participants = [];
      addParticipant("Alex");
      expect(getState().participants.length).toBe(1);
      expect(getState().participants[0].name).toBe("Alex");
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant from state', () => {
      removeParticipant("Whitney");
      expect(getState().participants.map(p => p.name)).toEqual(["Alex", "Hunter"]);
    });

    it('should remove participant from house before removing from state', () => {
      const id0 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id0, "Whitney");
      removeParticipant("Alex");
      expect(getState().houses[0].members).toEqual(["Whitney"]);
      expect(getState().participants.map(p => p.name)).toEqual(["Whitney", "Hunter"]);
    });

    it('should handle participant not in any house', () => {
      const id0 = addHouseToState();
      addNameToHouse(id0, "Whitney");
      removeParticipant("Alex");
      expect(getState().houses[0].members).toEqual(["Whitney"]);
      expect(getState().participants.map(p => p.name)).toEqual(["Whitney", "Hunter"]);
    });
  });

  describe('getHousesArray', () => {
    it('should return array of member arrays', () => {
      const id0 = addHouseToState();
      const id1 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id1, "Whitney");
      addNameToHouse(id1, "Hunter");
      expect(getHousesArray()).toEqual([["Alex"], ["Whitney", "Hunter"]]);
    });

    it('should filter out empty houses', () => {
      const id0 = addHouseToState();
      addHouseToState();
      const id2 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id2, "Whitney");
      expect(getHousesArray()).toEqual([["Alex"], ["Whitney"]]);
    });

    it('should handle empty getState().houses array', () => {
      getState().houses = [];
      expect(getHousesArray()).toEqual([]);
    });
  });

  describe('getIndividualParticipants', () => {
    it('should return individuals not in any house', () => {
      const id0 = addHouseToState();
      addNameToHouse(id0, "Alex");
      expect(getIndividualParticipants()).toEqual([["Whitney"], ["Hunter"]]);
    });

    it('should return all participants if no houses', () => {
      getState().houses = [];
      expect(getIndividualParticipants()).toEqual([["Alex"], ["Whitney"], ["Hunter"]]);
    });

    it('should return empty array if all participants are in houses', () => {
      const id0 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id0, "Whitney");
      addNameToHouse(id0, "Hunter");
      expect(getIndividualParticipants()).toEqual([]);
    });
  });

  describe('assignRecipients', () => {
    it('populates getState().assignments array', () => {
      installParticipantNames("Alex", "Whitney", "Hunter");
      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(getState().assignments).toEqual([
        {giver: "Alex", recipient: "Whitney"},
        {giver: "Whitney", recipient: "Hunter"},
        {giver: "Hunter", recipient: "Alex"}
      ]);
    });

    it('emits RECIPIENTS_ASSIGNED event with assignments', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.RECIPIENTS_ASSIGNED, spy);
      installParticipantNames("Alex", "Whitney", "Hunter");
      getState().isSecretSanta = false;

      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        isGenerated: true,
        isSecretSanta: false,
        assignments: [
          {giver: "Alex", recipient: "Whitney"},
          {giver: "Whitney", recipient: "Hunter"},
          {giver: "Hunter", recipient: "Alex"}
        ]
      }));

      unsubscribe();
    });

    it('includes current isSecretSanta value in emitted event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.RECIPIENTS_ASSIGNED, spy);
      installParticipantNames("Alex", "Whitney", "Hunter");
      getState().isSecretSanta = true;

      assignRecipients(["Whitney", "Hunter", "Alex"]);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        isGenerated: true,
        isSecretSanta: true,
        assignments: getState().assignments,
      }));

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
      const id0 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id0, "Whitney");
      expect(getHousesForGeneration()).toEqual([["Alex", "Whitney"], ["Hunter"]]);
    });

    it('should filter empty houses', () => {
      const id0 = addHouseToState();
      addHouseToState();
      const id2 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id2, "Whitney");
      expect(getHousesForGeneration()).toEqual([["Alex"], ["Whitney"], ["Hunter"]]);
    });

    it('should return only individuals when no houses exist', () => {
      getState().houses = [];
      expect(getHousesForGeneration()).toEqual([["Alex"], ["Whitney"], ["Hunter"]]);
    });

    it('should return only houses when all participants are in houses', () => {
      const id0 = addHouseToState();
      const id1 = addHouseToState();
      addNameToHouse(id0, "Alex");
      addNameToHouse(id0, "Whitney");
      addNameToHouse(id1, "Hunter");
      expect(getHousesForGeneration()).toEqual([["Alex", "Whitney"], ["Hunter"]]);
    });
  });

  describe('nextStep', () => {
    it('increments step and emits NEXT_STEP', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.NEXT_STEP, spy);

      nextStep();

      expect(getState().step).toBe(2);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({step: 2}));
      unsubscribe();
    });

    it('wraps to 0 when maxSteps is provided', () => {
      getState().step = 3;
      nextStep(3);
      expect(getState().step).toBe(0);
    });
  });

  describe('addEmailsToParticipants', () => {
    beforeEach(() => {
      getState().participants = [];
      installParticipantNames("Alex", "Whitney", "Hunter");
    });

    it('should set email on each participant by index', () => {
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0},
        {name: "Whitney", email: "whitney@example.com", index: 1}
      ];

      addEmailsToParticipants(emails);

      expect(getState().participants[0].email).toBe("alex@example.com");
      expect(getState().participants[1].email).toBe("whitney@example.com");
      expect(getState().participants[2].email).toBe("");
    });

    it('should handle multiple emails at once', () => {
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0},
        {name: "Whitney", email: "whitney@example.com", index: 1},
        {name: "Hunter", email: "hunter@example.com", index: 2}
      ];

      addEmailsToParticipants(emails);

      expect(getState().participants[0].email).toBe("alex@example.com");
      expect(getState().participants[1].email).toBe("whitney@example.com");
      expect(getState().participants[2].email).toBe("hunter@example.com");
    });

    it('should emit EMAILS_ADDED event', () => {
      const spy = vi.fn();
      const unsubscribe = stateEvents.on(Events.EMAILS_ADDED, spy);
      const emails = [
        {name: "Alex", email: "alex@example.com", index: 0}
      ];

      addEmailsToParticipants(emails);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({participants: getState().participants}));
      unsubscribe();
    });

    it('should handle empty emails array', () => {
      const originalParticipants = [...getState().participants];

      addEmailsToParticipants([]);

      expect(getState().participants).toEqual(originalParticipants);
    });
  });

  describe('getExchangePayload', () => {
    it('returns exchange data for POST body', () => {
      installParticipantNames("Alex", "Whitney");
      assignRecipients(["Whitney", "Alex"]);
      const payload = getExchangePayload();
      expect(payload.exchangeId).toBe(getState().exchangeId);
      expect(payload.isSecretSanta).toBe(getState().isSecretSanta);
      expect(payload.houses).toBe(getState().houses);
      expect(payload.participants).toBe(getState().participants);
      expect(payload.assignments).toBe(getState().assignments);
    });
  });

  describe('getParticipantNames', () => {
    it('returns array of participant name strings', () => {
      getState().participants = [];
      installParticipantNames("Alex", "Whitney");
      expect(getParticipantNames()).toEqual(["Alex", "Whitney"]);
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

      expect(getState().participants).toHaveLength(3);
      expect(getState().participants[0].name).toBe("Alex");
      expect(getState().participants[1].name).toBe("Whitney");
      expect(getState().participants[2].name).toBe("Hunter");
    });

    it('sets participant emails from exchange data', () => {
      loadExchange(exchangeData);

      expect(getState().participants[0].email).toBe("alex@gmail.com");
      expect(getState().participants[1].email).toBe("whitney@gmail.com");
      expect(getState().participants[2].email).toBe("hunter@gmail.com");
    });

    it('populates houses with names and members', () => {
      loadExchange(exchangeData);

      expect(getState().houses).toHaveLength(2);
      expect(getState().houses[0].name).toBe("Smith Family");
      expect(getState().houses[0].members).toEqual(["Alex", "Whitney"]);
      expect(getState().houses[1].name).toBe("Jones Family");
      expect(getState().houses[1].members).toEqual(["Hunter"]);
    });

    it('sets isSecretSanta from exchange data', () => {
      loadExchange(exchangeData);

      expect(getState().isSecretSanta).toBe(true);
    });

    it('generates a new exchangeId', () => {
      loadExchange(exchangeData);

      expect(getState().exchangeId).toBeDefined();
      expect(getState().exchangeId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('sets assignments to empty array', () => {
      loadExchange(exchangeData);

      expect(getState().assignments).toEqual([]);
    });

    it('initializes nameNumber to 1', () => {
      loadExchange(exchangeData);

      expect(getState().nameNumber).toBe(1);
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

      expect(getState().participants).toHaveLength(2);
      expect(getState().houses).toHaveLength(0);
      expect(getState().isSecretSanta).toBe(false);
    });
  });
});
