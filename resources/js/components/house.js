import state, {
  addHouseToState,
  addNameToHouse,
  removeHouseFromState,
  removeNameFromHouse
} from "../state.js";
import {addEventListener, selectElement} from "../utils.js";
import {registerComponent} from "../render.js";

const leftContainerId = "left-container";
const addHouseId = "addHouse";
const nameListSelectId = "name-list-select";

export function init() {
  registerComponent('house', houseRenderer);
  addEventListener(`#${nameListSelectId}`, "change", insertNameFromSelect);
  addEventListener(`#${addHouseId}`, "click", addHouse);
}

const houseRenderer = {
  onComponentAdded(event) {
    if (event.type !== 'house') return;

    const container = selectElement(`#${leftContainerId}`);
    if (!container) return;

    const index = Object.keys(state.houses).indexOf(event.id);
    const displayNumber = index + 1;
    const html = this.template(event.id, displayNumber);

    container.insertAdjacentHTML('beforeend', html);
    this.attachListeners(event.id);
  },

  onComponentRemoved(event) {
    if (event.type !== 'house') return;
    selectElement(`#${event.id}`)?.remove();
  },

  onComponentUpdated(event) {
  },

  template(houseID, displayNumber) {
    return `
      <div class="household" id="${houseID}">
        <h2 contenteditable="true">Group ${displayNumber} <span class="edit-span">(Click here to rename)</span></h2>
        <div data-slot="names-${houseID}" class="name-container"></div>
        <div data-slot="select-${houseID}"></div>
        <button class="button deleteHouse" id="${houseID}-delete">Delete Group</button>
      </div>`;
  },

  attachListeners(houseID) {
    addEventListener(`#${houseID}-delete`, 'click', deleteHouse);
  }
};

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
