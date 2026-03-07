import {addEventListener, nameListId, selectElement} from "../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents, addNameToHouse, removeNameFromHouse} from "../exchange/state.js";

export function init() {
  stateEvents.on(Events.PARTICIPANT_ADDED, ({participants}) => updateAllSelects(participants));
  stateEvents.on(Events.PARTICIPANT_REMOVED, ({participants}) => updateAllSelects(participants));
  stateEvents.on(Events.HOUSE_ADDED, ({houseID, participants}) => {
    const slot = document.querySelector(`[data-slot="select-${houseID}"]`);
    if (slot) renderIntoSlot(slot, participants);
  });
  stateEvents.on(Events.NAME_ADDED_TO_HOUSE, ({houseID, participants}) => {
    const slot = document.querySelector(`[data-slot="select-${houseID}"]`);
    if (slot) renderIntoSlot(slot, participants);
  });
  stateEvents.on(Events.NAME_REMOVED_FROM_HOUSE, ({houseID, participants}) => {
    const slot = document.querySelector(`[data-slot="select-${houseID}"]`);
    if (slot) renderIntoSlot(slot, participants);
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

function updateAllSelects(participants) {
  const slots = document.querySelectorAll('[data-slot^="select-"]');
  slots.forEach(slot => renderIntoSlot(slot, participants));
  updateNameListSelect(participants);
}

function updateNameListSelect(participants) {
  const nameListSelect = document.querySelector('#name-list-select');
  if (!nameListSelect) return;

  nameListSelect.innerHTML = `
      ${defaultOption()}
      ${allNameOptions(participants)}`;
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
