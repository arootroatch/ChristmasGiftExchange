import { stateEvents, Events } from './events.js';

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
  stateEvents.emit(Events.COMPONENT_ADDED, {
    type: 'house',
    id: houseID,
    data: state.houses[houseID]
  });
}

export function removeHouseFromState(houseID) {
  delete state.houses[houseID];
  stateEvents.emit(Events.COMPONENT_REMOVED, {
    type: 'house',
    id: houseID
  });
}

export function addNameToHouse(houseID, name) {
  if (!state.houses[houseID]) {
    state.houses[houseID] = [];
  }
  if (!state.houses[houseID].includes(name)) {
    state.houses[houseID].push(name);
    stateEvents.emit(Events.COMPONENT_UPDATED, {
      type: 'house',
      id: houseID,
      data: state.houses[houseID]
    });
    // Trigger participants list re-render (names moved from main list to house)
    stateEvents.emit(Events.COMPONENT_UPDATED, {
      type: 'name',
      id: 'participants',
      data: state.givers
    });
  }
}

export function removeNameFromHouse(houseID, name) {
  if (state.houses[houseID]) {
    state.houses[houseID] = state.houses[houseID].filter(n => n !== name);
    stateEvents.emit(Events.COMPONENT_UPDATED, {
      type: 'house',
      id: houseID,
      data: state.houses[houseID]
    });
    // Trigger participants list re-render (names moved from house to main list)
    stateEvents.emit(Events.COMPONENT_UPDATED, {
      type: 'name',
      id: 'participants',
      data: state.givers
    });
  }
}

export function addGiver(giver) {
  state.givers.push(giver);
  stateEvents.emit(Events.COMPONENT_ADDED, {
    type: 'name',
    id: giver.name,
    data: giver
  });
}

export function removeGiver(name) {
  state.givers = state.givers.filter(g => g.name !== name);
  stateEvents.emit(Events.COMPONENT_REMOVED, {
    type: 'name',
    id: name
  });
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

export default state;