import {EventEmitter} from '../EventEmitter.js';

export const exchangeEvents = new EventEmitter();

export const ExchangeEvents = {
  EXCHANGE_STARTED: 'exchange:started',
  EMAIL_RESULTS_REQUESTED: 'email:resultsRequested',
  EXCHANGE_COMPLETE: 'exchange:complete',
  ORGANIZER_SET: 'organizer:set',
  PARTICIPANT_ADDED: 'participant:added',
  PARTICIPANT_REMOVED: 'participant:removed',
  HOUSE_ADDED: 'house:added',
  HOUSE_REMOVED: 'house:removed',
  HOUSE_RENAMED: 'house:renamed',
  NAME_ADDED_TO_HOUSE: 'name:addedToHouse',
  NAME_REMOVED_FROM_HOUSE: 'name:removedFromHouse',
  RECIPIENTS_ASSIGNED: 'recipients:assigned',
};

const state = {
  exchangeId: '',
  houses: [],
  isSecretSanta: false,
  participants: [],
  assignments: [],
  nameNumber: 1,
};

export function getState() {
  return state;
}

export function startExchange(isSecretSanta = false, {isReuse = false} = {}) {
  state.exchangeId = crypto.randomUUID();
  state.houses = [];
  state.isSecretSanta = isSecretSanta;
  state.participants = [];
  state.assignments = [];
  state.nameNumber = 1;
  exchangeEvents.emit(ExchangeEvents.EXCHANGE_STARTED, {isReuse, ...state});
}

export function requestEmailResults() {
  exchangeEvents.emit(ExchangeEvents.EMAIL_RESULTS_REQUESTED, {...state});
}

export function completeExchange(mode) {
  exchangeEvents.emit(ExchangeEvents.EXCHANGE_COMPLETE, {...state, mode});
}

export function setOrganizer() {
  exchangeEvents.emit(ExchangeEvents.ORGANIZER_SET, {...state});
}


class Participant {
  constructor(name, email = "") {
    this.name = name;
    this.email = email;
  }
}

function findHouse(houseID) {
  return state.houses.find(h => h.id === houseID);
}

export function addHouseToState() {
  const houseID = `house-${state.houses.length}`;
  const displayNumber = state.houses.length + 1;
  state.houses.push({id: houseID, name: `House ${displayNumber}`, members: []});
  exchangeEvents.emit(ExchangeEvents.HOUSE_ADDED, {houseID, ...state});
  return houseID;
}

export function removeHouseFromState(houseID) {
  const house = findHouse(houseID);
  if (house) {
    const names = [...house.members];
    names.forEach(name => removeNameFromHouse(houseID, name));
  }
  state.houses = state.houses.filter(h => h.id !== houseID);
  exchangeEvents.emit(ExchangeEvents.HOUSE_REMOVED, {houseID, ...state});
}

export function renameHouse(houseID, name) {
  const house = findHouse(houseID);
  if (house) {
    house.name = name;
    exchangeEvents.emit(ExchangeEvents.HOUSE_RENAMED, {houseID, name, ...state});
  }
}

export function addNameToHouse(houseID, name) {
  const house = findHouse(houseID);
  if (!house) return;
  if (!house.members.includes(name)) {
    house.members.push(name);
    exchangeEvents.emit(ExchangeEvents.NAME_ADDED_TO_HOUSE, {houseID, name, members: house.members, ...state});
  }
}

export function removeNameFromHouse(houseID, name) {
  const house = findHouse(houseID);
  if (house) {
    house.members = house.members.filter(n => n !== name);
    exchangeEvents.emit(ExchangeEvents.NAME_REMOVED_FROM_HOUSE, {houseID, name, members: house.members, ...state});
  }
}

export function addParticipant(name) {
  const participant = new Participant(name);
  state.participants.push(participant);
  exchangeEvents.emit(ExchangeEvents.PARTICIPANT_ADDED, {name, participant, ...state});
}

export function removeParticipant(name) {
  state.houses.forEach(house => {
    if (house.members.includes(name)) {
      removeNameFromHouse(house.id, name);
    }
  });
  state.participants = state.participants.filter(p => p.name !== name);
  exchangeEvents.emit(ExchangeEvents.PARTICIPANT_REMOVED, {name, ...state});
}

export function getHousesArray() {
  return state.houses
    .filter(h => h.members.length > 0)
    .map(h => h.members);
}

export function getIndividualParticipants() {
  const allNamesInHouses = state.houses.flatMap(h => h.members);
  return state.participants
    .map(p => p.name)
    .filter(name => !allNamesInHouses.includes(name))
    .map(name => [name]); // Wrap in array for algorithm compatibility
}

export function getHousesForGeneration() {
  return getHousesArray().concat(getIndividualParticipants());
}

export function assignRecipients(recipientNames) {
  state.assignments = recipientNames.map((recipient, index) => ({
    giver: state.participants[index].name,
    recipient
  }));
  exchangeEvents.emit(ExchangeEvents.RECIPIENTS_ASSIGNED, {...state, isGenerated: true});
}

export function nextNameNumber() {
  return state.nameNumber++;
}

export function isGenerated() {
  return state.assignments.length > 0;
}

export function getExchangePayload() {
  return {
    exchangeId: state.exchangeId,
    isSecretSanta: state.isSecretSanta,
    houses: state.houses,
    participants: state.participants,
    assignments: state.assignments,
  };
}

export function getParticipantNames() {
  return state.participants.map(p => p.name);
}

export function loadExchange(exchangeData) {
  startExchange(exchangeData.isSecretSanta, {isReuse: true});

  exchangeData.participants.forEach(p => {
    addParticipant(p.name);
    const participant = state.participants.find(pp => pp.name === p.name);
    if (participant) participant.email = p.email;
  });

  exchangeData.houses.forEach(h => {
    const houseID = addHouseToState();
    const house = findHouse(houseID);
    if (house) {
      house.name = h.name;
      const heading = document.querySelector(`#${houseID} h2`);
      if (heading) heading.childNodes[0].textContent = `${h.name} `;
    }
    h.members.forEach(name => addNameToHouse(houseID, name));
  });

}
