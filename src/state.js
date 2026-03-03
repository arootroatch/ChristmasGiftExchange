import {Events, stateEvents} from './Events.js';

export let state;

export function startExchange(isSecretSanta = false) {
  state = {
    exchangeId: crypto.randomUUID(),
    houses: {},
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

export function addHouseToState(houseID) {
  state.houses[houseID] = [];
  stateEvents.emit(Events.HOUSE_ADDED, {houseID});
}

export function removeHouseFromState(houseID) {
  delete state.houses[houseID];
  stateEvents.emit(Events.HOUSE_REMOVED, {houseID});
}

export function addNameToHouse(houseID, name) {
  if (!state.houses[houseID]) {
    state.houses[houseID] = [];
  }
  if (!state.houses[houseID].includes(name)) {
    state.houses[houseID].push(name);
    stateEvents.emit(Events.NAME_ADDED_TO_HOUSE, {houseID, name, members: state.houses[houseID]});
  }
}

export function removeNameFromHouse(houseID, name) {
  if (state.houses[houseID]) {
    state.houses[houseID] = state.houses[houseID].filter(n => n !== name);
    stateEvents.emit(Events.NAME_REMOVED_FROM_HOUSE, {houseID, name, members: state.houses[houseID]});
  }
}

export function addParticipant(name) {
  const participant = new Participant(name);
  state.participants.push(participant);
  stateEvents.emit(Events.PARTICIPANT_ADDED, {name, participant});
}

export function removeParticipant(name) {
  Object.keys(state.houses).forEach(houseID => {
    if (state.houses[houseID].includes(name)) {
      removeNameFromHouse(houseID, name);
    }
  });
  state.participants = state.participants.filter(p => p.name !== name);
  stateEvents.emit(Events.PARTICIPANT_REMOVED, {name});
}

export function getHousesArray() {
  return Object.values(state.houses).filter(h => h.length > 0);
}

export function getIndividualParticipants() {
  const allNamesInHouses = Object.values(state.houses).flat();
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
