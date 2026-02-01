import state, {
  addHouseToState,
  removeHouseFromState,
  addNameToHouse,
  removeNameFromHouse
} from "../state.js";
import {addEventListener, selectElement} from "../utils.js";
import { registerComponent } from "../render.js";
import { stateEvents, Events } from "../events.js";

const participantsId = "participants";
const leftContainerId = "left-container";
const addHouseId = "addHouse";
const nameListSelectId = "name-list-select";

// User actions - only update state
export function addHouse() {
  const houseNumber = Object.keys(state.houses).length;
  const houseID = `house-${houseNumber}`;
  addHouseToState(houseID);
}

export function deleteHouse() {
  const houseDiv = this.closest('.household') || this.parentNode;
  const houseID = houseDiv.id;

  const names = [...(state.houses[houseID] || [])];
  names.forEach(name => {
    removeNameFromHouse(houseID, name);
  });

  removeHouseFromState(houseID);
}

export function insertNameFromSelect() {
  const name = this.value;
  if (name === "default") return;

  const sourceContainer = document.querySelector(`#wrapper-${name}`)?.parentNode;
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

// Generic lifecycle - responds to all component events
const houseRenderer = {
  onComponentAdded(event) {
    // Only handle house additions
    if (event.type !== 'house') return;

    const container = selectElement(`#${leftContainerId}`);
    if (!container) return;

    const index = Object.keys(state.houses).indexOf(event.id);
    const displayNumber = index + 1;
    const html = this.template(event.id, displayNumber);

    container.insertAdjacentHTML('beforeend', html);

    // Trigger name and select components to render into the new house's slots
    this.fillNameSlots(event.id);

    // Attach listeners after slots are filled
    this.attachListeners(event.id);
  },

  onComponentRemoved(event) {
    if (event.type !== 'house') return;
    selectElement(`#${event.id}`)?.remove();
  },

  onComponentUpdated(event) {
    if (event.type !== 'house') return;

    // Notify slot that it needs to re-render
    const house = selectElement(`#${event.id}`);
    if (!house) return;

    const slot = house.querySelector(`[data-slot="names-${event.id}"]`);
    if (slot) {
      slot.setAttribute('data-needs-update', 'true');
      this.fillNameSlots(event.id);
    }
  },

  template(houseID, displayNumber) {
    return `
      <div class="household" id="${houseID}">
        <h2 contenteditable="true">Group ${displayNumber} <span class="edit-span">(Click here to rename)</span></h2>
        <div class="name-container" data-slot="names-${houseID}"></div>
        <div data-slot="select-${houseID}"></div>
        <button class="button deleteHouse" id="${houseID}-delete">Delete Group</button>
      </div>`;
  },

  fillNameSlots(houseID) {
    // Dispatch event for child components to fill their slots
    stateEvents.emit(Events.COMPONENT_UPDATED, {
      type: 'name-list',
      id: `names-${houseID}`,
      containerID: houseID,
      data: state.houses[houseID]
    });

    stateEvents.emit(Events.COMPONENT_UPDATED, {
      type: 'select',
      id: `select-${houseID}`,
      data: state.givers
    });
  },

  attachListeners(houseID) {
    addEventListener(`#${houseID}-delete`, 'click', deleteHouse);
    addEventListener(`#${houseID}-select`, 'change', insertNameFromSelect);
  }
};

// Initialize
export function init() {
  registerComponent('house', houseRenderer);
  addEventListener(`#${nameListSelectId}`, "change", insertNameFromSelect);
  addEventListener(`#${addHouseId}`, "click", addHouse);
}

// Backward compatibility with tests
export const initEventListeners = init;
