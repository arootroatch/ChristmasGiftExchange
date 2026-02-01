import state from "../state";
import {addEventListener, pushHTMl, selectElement, removeEventListener} from "../utils";

const participantsId = "participants";
const leftContainerId = "left-container";
const addHouseId = "addHouse";
const nameListSelectId = "name-list-select";

export function houseTemplate() {
  return `
    <div class="household" id="house-${state.houseID}">
      <h2 contenteditable="true">Group ${state.houseID + 1} <span class="edit-span">(Click here to rename)</span></h2>
      <div class="name-container"></div>
      <select class="name-select" name="select-${state.houseID}" id="select-${state.houseID}">
        ${nameSelectContent()}
      </select>
      <button class="button deleteHouse" id="delete-${state.houseID}">Delete Group</button>
    </div>`
}

export function nameSelectContent() {
  return `
    <option disabled selected value="default">-- Select a name --</option>
    ${state.givers.map((giver) => `<option value="${giver.name}">${giver.name}</option>`)}
    `;
}

export function addHouse() {
  pushHTMl(`#${leftContainerId}`, houseTemplate());
  addEventListener(`#delete-${state.houseID}`, "click", deleteHouse);
  addEventListener(`#select-${state.houseID}`, "change", insertNameFromSelect);
  state.houseID += 1;
}

export function insertNameFromSelect() {
  let firstName = this.value;
  let nameDiv = selectElement(`#wrapper-${firstName}`);
  if (this.parentNode.id === "name-list") {
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

function getHouseIndex(houseDiv){
  return houseDiv.id.split("-")[1];
}

export function deleteHouse() {
  const houseDiv = this.closest('.household') || this.parentNode;
  const houseIndex = getHouseIndex(houseDiv);
  returnNamesToMainList(houseDiv);
  removeEventListener(`#delete-${houseIndex}`, "click", deleteHouse);
  removeEventListener(`#select-${houseIndex}`, "change", insertNameFromSelect);
  houseDiv.remove();
}

export function initEventListeners(){
  addEventListener(`#${nameListSelectId}`, "change", insertNameFromSelect);
  addEventListener(`#${addHouseId}`, "click", addHouse);
}
