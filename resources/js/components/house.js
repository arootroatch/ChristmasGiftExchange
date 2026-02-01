import state, {
  addHouseToState,
  removeHouseFromState,
  addNameToHouse,
  removeNameFromHouse
} from "../state";
import {addEventListener, pushHTMl, selectElement, removeEventListener} from "../utils";

const participantsId = "participants";
const leftContainerId = "left-container";
const addHouseId = "addHouse";
const nameListSelectId = "name-list-select";

export function houseTemplate(houseID, displayNumber) {
  return `
    <div class="household" id="${houseID}">
      <h2 contenteditable="true">Group ${displayNumber} <span class="edit-span">(Click here to rename)</span></h2>
      <div class="name-container"></div>
      <select class="name-select" name="${houseID}-select" id="${houseID}-select">
        ${nameSelectContent()}
      </select>
      <button class="button deleteHouse" id="${houseID}-delete">Delete Group</button>
    </div>`
}

export function nameSelectContent() {
  return `
    <option disabled selected value="default">-- Select a name --</option>
    ${state.givers.map((giver) => `<option value="${giver.name}">${giver.name}</option>`)}
    `;
}

export function addHouse() {
  const houseNumber = Object.keys(state.houses).length;
  const houseID = `house-${houseNumber}`;
  const displayNumber = houseNumber + 1;

  addHouseToState(houseID);

  pushHTMl(`#${leftContainerId}`, houseTemplate(houseID, displayNumber));
  addEventListener(`#${houseID}-delete`, "click", deleteHouse);
  addEventListener(`#${houseID}-select`, "change", insertNameFromSelect);
}

export function insertNameFromSelect() {
  const name = this.value;
  const nameDiv = selectElement(`#wrapper-${name}`);

  const sourceContainer = nameDiv.parentNode;
  const sourceHouse = sourceContainer.closest('.household');
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

  if (isDestMainList) {
    selectElement(`#${participantsId}`).appendChild(nameDiv);
  } else {
    this.previousElementSibling.appendChild(nameDiv);
  }

  this.value = "default";
}

function returnNamesToMainList(houseDiv){
  const nameContainer = houseDiv.querySelector('.name-container');
  const participants = selectElement(`#${participantsId}`);
  const nameWrappers = [...nameContainer.querySelectorAll('.name-wrapper')];

  nameWrappers.forEach(wrapper => {
    participants.appendChild(wrapper);
  });
}

export function deleteHouse() {
  const houseDiv = this.closest('.household') || this.parentNode;
  const houseID = houseDiv.id;

  returnNamesToMainList(houseDiv);
  removeHouseFromState(houseID);

  removeEventListener(`#${houseID}-delete`, "click", deleteHouse);
  removeEventListener(`#${houseID}-select`, "change", insertNameFromSelect);
  houseDiv.remove();
}

export function initEventListeners(){
  addEventListener(`#${nameListSelectId}`, "change", insertNameFromSelect);
  addEventListener(`#${addHouseId}`, "click", addHouse);
}
