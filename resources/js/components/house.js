import {
  state,
  addHouseToState,
  addNameToHouse,
  removeHouseFromState,
  removeNameFromHouse
} from "../state.js";
import {addEventListener, selectElement} from "../utils.js";
import {Events, stateEvents} from "../events.js";

const leftContainerId = "left-container";
const addHouseId = "addHouse";
const nameListSelectId = "name-list-select";

export function init() {
  stateEvents.on(Events.HOUSE_ADDED, onHouseAdded);
  stateEvents.on(Events.HOUSE_REMOVED, onHouseRemoved);
  addEventListener(`#${nameListSelectId}`, "change", insertNameFromSelect);
  addEventListener(`#${addHouseId}`, "click", addHouse);
}

function onHouseAdded({houseID}) {
  const container = selectElement(`#${leftContainerId}`);
  if (!container) return;

  const index = Object.keys(state.houses).indexOf(houseID);
  const displayNumber = index + 1;
  const html = template(houseID, displayNumber);

  container.insertAdjacentHTML('beforeend', html);
  attachListeners(houseID);
}

function onHouseRemoved({houseID}) {
  selectElement(`#${houseID}`)?.remove();
}

function template(houseID, displayNumber) {
  return `
      <div class="household" id="${houseID}">
        <h2 contenteditable="true">Group ${displayNumber} <span class="edit-span">(Click here to rename)</span></h2>
        <div data-slot="names-${houseID}" class="name-container"></div>
        <div data-slot="select-${houseID}"></div>
        <button class="button deleteHouse" id="${houseID}-delete">Delete Group</button>
      </div>`;
}

function attachListeners(houseID) {
  addEventListener(`#${houseID}-delete`, 'click', deleteHouse);
}

export function addHouse() {
  const houseNumber = Object.keys(state.houses).length;
  const houseID = `house-${houseNumber}`;
  addHouseToState(houseID);
}

export function deleteHouse() {
  const houseDiv = this.closest('.household') || this.parentNode;
  const houseID = houseDiv.id;

  const names = [...(state.houses[houseID] || [])];
  names.forEach(name => removeNameFromHouse(houseID, name));
  removeHouseFromState(houseID);
}

export function insertNameFromSelect() {
  const name = this.value;
  if (name === "default") return;

  const sourceContainer = selectElement(`#wrapper-${name}`)?.parentNode;
  const sourceHouse = sourceContainer?.closest('.household');
  const sourceHouseID = sourceHouse?.id;

  const isDestMainList = (this.parentNode.id === "name-list");
  const destHouse = this.closest('.household');
  const destHouseID = isDestMainList ? null : destHouse?.id;

  if (sourceHouseID) {
    removeNameFromHouse(sourceHouseID, name);
  }
  if (destHouseID) {
    addNameToHouse(destHouseID, name);
  }

  this.value = "default";
}
