import {Events, stateEvents} from './events.js';

let state = {
  houses: {},
  introIndex: 0,
  isSecretSanta: false,
  givers: [],
  nameNumber: 1,
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
  emitAddComponent('house', houseID, state.houses[houseID]);
}

export function removeHouseFromState(houseID) {
  delete state.houses[houseID];
  emitRemoveComponent('house', houseID);
}

export function addNameToHouse(houseID, name) {
  if (!state.houses[houseID]) {
    state.houses[houseID] = [];
  }
  if (!state.houses[houseID].includes(name)) {
    state.houses[houseID].push(name);
    emitUpdateComponent('house', houseID, state.houses[houseID]);
    emitUpdateComponent('name', 'participants', state.givers);
  }
}

export function removeNameFromHouse(houseID, name) {
  if (state.houses[houseID]) {
    state.houses[houseID] = state.houses[houseID].filter(n => n !== name);
    emitUpdateComponent('house', houseID, state.houses[houseID]);
    emitUpdateComponent('name', 'participants', state.givers);
  }
}

export function addGiver(name) {
  const giver = new Giver(name);
  state.givers.push(giver);
  emitAddComponent('name', giver.name, giver);
}

export function removeGiver(name) {
  state.givers = state.givers.filter(g => g.name !== name);
  emitRemoveComponent('name', name);
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
  emitUpdateComponent('resultsTable', 'main', {
    isGenerated: true,
    isSecretSanta: state.isSecretSanta,
    givers: state.givers
  });
}

export function isGenerated(){
  return state.givers.every(g => g.recipient && g.recipient !== "");
}

function emitAddComponent(type, id, data) {
  stateEvents.emit(Events.COMPONENT_ADDED, {
    type: type,
    id: id,
    data: data
  });
}

function emitUpdateComponent(type, id, data) {
  stateEvents.emit(Events.COMPONENT_UPDATED, {
    type: type,
    id: id,
    data: data
  });
}

function emitRemoveComponent(type, id) {
  stateEvents.emit(Events.COMPONENT_REMOVED, {
    type: type,
    id: id,
  });
}

export default state;