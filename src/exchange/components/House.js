import {
  ExchangeEvents as Events,
  exchangeEvents as stateEvents,
  removeHouseFromState,
  renameHouse
} from "../state.js";
import {addEventListener, leftContainerId, pushHTML, selectElement} from "../../utils.js";
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';

export function init() {
  stateEvents.on(Events.HOUSE_ADDED, onHouseAdded);
  stateEvents.on(Events.HOUSE_REMOVED, onHouseRemoved);
  stateEvents.on(Events.NAME_ADDED_TO_HOUSE, onNameChange);
  stateEvents.on(Events.NAME_REMOVED_FROM_HOUSE, onNameChange);
}

function onHouseAdded({houseID, houses}) {
  if (!selectElement(`#${leftContainerId}`)) return;
  const house = houses.find(h => h.id === houseID);
  const html = template(houseID, house.name);
  pushHTML(`#${leftContainerId}`, html);
  attachListeners(houseID);
  setTimeout(() => window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'}));
}

function onHouseRemoved({houseID}) {
  selectElement(`#${houseID}`)?.remove();
}

function template(houseID, displayName) {
  return `
      <div class="household" id="${houseID}">
        <h2 contenteditable="true">${displayName} <span class="edit-span">(Click here to rename)</span></h2>
        <div data-slot="names-${houseID}" class="name-container">
          <p class="house-placeholder ghost-text">Drop names here or select them from the dropdown</p>
        </div>
        <div data-slot="select-${houseID}"></div>
        <button class="${btnStyles.button} ${btnStyles.deleteHouse}" id="${houseID}-delete">Delete House</button>
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

function onNameChange({houseID, members}) {
  const placeholder = selectElement(`#${houseID} .house-placeholder`);
  if (!placeholder) return;
  placeholder.style.display = members.length > 0 ? "none" : "";
}

function deleteHouse() {
  const houseDiv = this.closest('.household') || this.parentNode;
  const houseID = houseDiv.id;
  removeHouseFromState(houseID);
}
