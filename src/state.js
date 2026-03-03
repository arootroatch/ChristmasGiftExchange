import {Events, stateEvents} from './Events.js';

export let state;

export function startExchange(isSecretSanta = false) {
  state = {
    exchangeId: crypto.randomUUID(),
    houses: [],
    step: 1,
    isSecretSanta: isSecretSanta,
    participants: [],
    nameNumber: 1,
  }
  stateEvents.emit(Events.EXCHANGE_STARTED);
}

export function nextStep(maxSteps = null) {
  if (typeof maxSteps === "number") {
    state.step + 1 > maxSteps ? (state.step = 0) : state.step++;
  } else {
    state.step++;
  }
  stateEvents.emit(Events.NEXT_STEP, {step: state.step});
}


export class Participant {
  constructor(name, email = "") {
    this.name = name;
    this.email = email;
  }
}

function findHouse(houseID) {
  return state.houses.find(h => h.id === houseID);
}

export function addHouseToState(houseID) {
  const displayNumber = state.houses.length + 1;
  state.houses.push({id: houseID, name: `Group ${displayNumber}`, members: []});
  stateEvents.emit(Events.HOUSE_ADDED, {houseID});
}

export function removeHouseFromState(houseID) {
  state.houses = state.houses.filter(h => h.id !== houseID);
  stateEvents.emit(Events.HOUSE_REMOVED, {houseID});
}

export function addNameToHouse(houseID, name) {
  const house = findHouse(houseID);
  if (!house) return;
  if (!house.members.includes(name)) {
    house.members.push(name);
    stateEvents.emit(Events.NAME_ADDED_TO_HOUSE, {houseID, name, members: house.members});
  }
}

export function removeNameFromHouse(houseID, name) {
  const house = findHouse(houseID);
  if (house) {
    house.members = house.members.filter(n => n !== name);
    stateEvents.emit(Events.NAME_REMOVED_FROM_HOUSE, {houseID, name, members: house.members});
  }
}

export function addParticipant(name) {
  const participant = new Participant(name);
  state.participants.push(participant);
  stateEvents.emit(Events.PARTICIPANT_ADDED, {name, participant});
}

export function removeParticipant(name) {
  state.houses.forEach(house => {
    if (house.members.includes(name)) {
      removeNameFromHouse(house.id, name);
    }
  });
  state.participants = state.participants.filter(p => p.name !== name);
  stateEvents.emit(Events.PARTICIPANT_REMOVED, {name});
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

export function assignRecipients(assignments) {
  assignments.forEach((recipient, index) => {
    state.participants[index].recipient = recipient;
  });
  stateEvents.emit(Events.RECIPIENTS_ASSIGNED, {
    isGenerated: true,
    isSecretSanta: state.isSecretSanta,
    participants: state.participants
  });
}

export function addEmailsToParticipants(emails) {
  emails.forEach((obj) => {
    let i = parseInt(obj.index);
    state.participants[i].email = obj.email;
  });
  stateEvents.emit(Events.EMAILS_ADDED, {participants: state.participants});
}

export function isGenerated() {
  return state.participants.every(p => p.recipient && p.recipient !== "");
}
