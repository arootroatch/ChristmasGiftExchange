import {Events, stateEvents} from './events.js';

export let state;

export function startExchange(isSecretSanta = false) {
  state = {
    houses: {},
    step: 1,
    isSecretSanta: isSecretSanta,
    givers: [],
    nameNumber: 1,
  }
}


export class Giver {
  constructor(name, recipient = "", email = "") {
    this.name = name;
    this.email = email;
    this.recipient = recipient;
    this.date = "";
    this.id = "";
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

export function addGiver(name) {
  const giver = new Giver(name);
  state.givers.push(giver);
  stateEvents.emit(Events.GIVER_ADDED, {name, giver});
}

export function removeGiver(name) {
  Object.keys(state.houses).forEach(houseID => {
    if (state.houses[houseID].includes(name)) {
      removeNameFromHouse(houseID, name);
    }
  });
  state.givers = state.givers.filter(g => g.name !== name);
  stateEvents.emit(Events.GIVER_REMOVED, {name});
}

export function getHousesArray() {
  return Object.values(state.houses).filter(h => h.length > 0);
}

export function getIndividualParticipants() {
  const allNamesInHouses = Object.values(state.houses).flat();
  return state.givers
    .map(g => g.name)
    .filter(name => !allNamesInHouses.includes(name))
    .map(name => [name]); // Wrap in array for algorithm compatibility
}

export function getHousesForGeneration() {
  return getHousesArray().concat(getIndividualParticipants());
}

export function assignRecipients(assignments) {
  assignments.forEach((recipient, index) => {
    state.givers[index].recipient = recipient;
  });
  stateEvents.emit(Events.RECIPIENTS_ASSIGNED, {
    isGenerated: true,
    isSecretSanta: state.isSecretSanta,
    givers: state.givers
  });
}

export function isGenerated() {
  return state.givers.every(g => g.recipient && g.recipient !== "");
}
