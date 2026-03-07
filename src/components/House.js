import {
  ExchangeEvents as Events,
  exchangeEvents as stateEvents,
  removeHouseFromState,
  renameHouse
} from "../exchangeState.js";
import {addEventListener, leftContainerId, selectElement} from "../utils.js";

export function init() {
  stateEvents.on(Events.HOUSE_ADDED, onHouseAdded);
  stateEvents.on(Events.HOUSE_REMOVED, onHouseRemoved);
}

function onHouseAdded({houseID, houses}) {
  const container = selectElement(`#${leftContainerId}`);
  if (!container) return;
  const house = houses.find(h => h.id === houseID);
  const html = template(houseID, house.name);
  container.insertAdjacentHTML('beforeend', html);
  attachListeners(houseID);
}

function onHouseRemoved({houseID}) {
  selectElement(`#${houseID}`)?.remove();
}

function template(houseID, displayName) {
  return `
      <div class="household" id="${houseID}">
        <h2 contenteditable="true">${displayName} <span class="edit-span">(Click here to rename)</span></h2>
        <div data-slot="names-${houseID}" class="name-container"></div>
        <div data-slot="select-${houseID}"></div>
        <button class="button deleteHouse" id="${houseID}-delete">Delete Group</button>
      </div>`;
}

function attachListeners(houseID) {
  addEventListener(`#${houseID}-delete`, 'click', deleteHouse);
  addEventListener(`#${houseID} h2`, 'blur', onHouseRenamed);
}

function onHouseRenamed() {
  const houseDiv = this.closest('.household');
  const houseID = houseDiv.id;
  const newName = this.textContent.trim();
  renameHouse(houseID, newName);
}

function deleteHouse() {
  const houseDiv = this.closest('.household') || this.parentNode;
  const houseID = houseDiv.id;
  removeHouseFromState(houseID);
}
