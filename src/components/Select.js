import {addEventListener, nameListId, selectElement} from "../utils.js";
import {addNameToHouse, removeNameFromHouse, state} from "../state.js";
import {Events, stateEvents} from "../Events.js";

export function init() {
  stateEvents.on(Events.PARTICIPANT_ADDED, () => updateAllSelects());
  stateEvents.on(Events.PARTICIPANT_REMOVED, () => updateAllSelects());
  stateEvents.on(Events.HOUSE_ADDED, ({houseID}) => {
    const slot = document.querySelector(`[data-slot="select-${houseID}"]`);
    if (slot) renderIntoSlot(slot, state.participants);
  });
  stateEvents.on(Events.NAME_ADDED_TO_HOUSE, ({houseID}) => {
    const slot = document.querySelector(`[data-slot="select-${houseID}"]`);
    if (slot) renderIntoSlot(slot, state.participants);
  });
  stateEvents.on(Events.NAME_REMOVED_FROM_HOUSE, ({houseID}) => {
    const slot = document.querySelector(`[data-slot="select-${houseID}"]`);
    if (slot) renderIntoSlot(slot, state.participants);
  });
}

export function insertNameFromSelect() {
  const name = this.value;
  if (name === "default") return;

  const sourceContainer = selectElement(`#wrapper-${name}`)?.parentNode;
  const sourceHouse = sourceContainer?.closest('.household');
  const sourceHouseID = sourceHouse?.id;

  const isDestMainList = (this.parentNode.id === nameListId);
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

function updateAllSelects() {
  const slots = document.querySelectorAll('[data-slot^="select-"]');
  slots.forEach(slot => renderIntoSlot(slot, state.participants));
  updateNameListSelect();
}

function updateNameListSelect() {
  const nameListSelect = document.querySelector('#name-list-select');
  if (!nameListSelect) return;

  nameListSelect.innerHTML = `
      ${defaultOption()}
      ${allNameOptions(state.participants)}`;
}

function renderIntoSlot(slot, participants) {
  const slotId = slot.getAttribute('data-slot');
  const houseID = slotId.replace('select-', '');
  let select = slot.querySelector(`#${houseID}-select`);

  if (!select) {
    slot.innerHTML = template(houseID, participants);
    addEventListener(`#${houseID}-select`, 'change', insertNameFromSelect);
  } else {
    select.innerHTML = `
        ${defaultOption()}
        ${allNameOptions(participants)}`;
  }
}

function template(houseID, participants) {
  return `
      <select class="name-select" id="${houseID}-select">
        ${defaultOption()}
        ${allNameOptions(participants)}
      </select>`;
}

function allNameOptions(participants) {
  return participants.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
}

function defaultOption() {
  return `<option value="default" selected="selected">-- Select a name --</option>`
}
