import { stateEvents, Events } from './events.js';
import {Giver} from "./components/name";

let state = {
  houses: {},
  isGenerated: false,
  introIndex: 0,
  isSecretSanta: false,
  givers: [],
  nameNumber: 1,
}
export function addHouseToState(houseID) {
  state.houses[houseID] = [];
  addComponent('house', houseID, state.houses[houseID]);
}

export function removeHouseFromState(houseID) {
  delete state.houses[houseID];
  removeComponent('house', houseID);
}

export function addNameToHouse(houseID, name) {
  if (!state.houses[houseID]) {
    state.houses[houseID] = [];
  }
  if (!state.houses[houseID].includes(name)) {
    state.houses[houseID].push(name);
    updateComponent('house', houseID, state.houses[houseID]);
    updateComponent('name', 'participants', state.givers);
  }
}

export function removeNameFromHouse(houseID, name) {
  if (state.houses[houseID]) {
    state.houses[houseID] = state.houses[houseID].filter(n => n !== name);
    updateComponent('house', houseID, state.houses[houseID]);
    updateComponent('name', 'participants', state.givers);
  }
}

export function addGiver(name) {
  const giver = new Giver(name);
  state.givers.push(giver);
  addComponent('name', giver.name, giver);
}

export function removeGiver(name) {
  state.givers = state.givers.filter(g => g.name !== name);
  removeComponent('name', name);
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


export function addComponent(type, id, data){
  stateEvents.emit(Events.COMPONENT_ADDED, {
    type: type,
    id: id,
    data: data
  });
}

export function updateComponent(type, id, data){
  stateEvents.emit(Events.COMPONENT_UPDATED, {
    type: type,
    id: id,
    data: data
  });
}

export function updateChildComponent(type, id, containerID, data){
  stateEvents.emit(Events.COMPONENT_UPDATED, {
    type: type,
    id: id,
    containerID: containerID,
    data: data
  });
}

export function removeComponent(type, id){
  stateEvents.emit(Events.COMPONENT_REMOVED, {
    type: type,
    id: id,
  });
}

export default state;