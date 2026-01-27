import state from "../state";
import {addEventListener, pushHTMl} from "../utils";


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

// addEventListener("addHouse", "click", addHouse);

export function addHouse() {
  pushHTMl("left-container", houseTemplate());
  addEventListener(`delete-${state.houseID}`, "click", deleteHouse);
  addEventListener(`select-${state.houseID}`, "change", insertNameFromSelect);
  state.houseID += 1;
}

// addEventListener(`name-list-select`, "change", insertNameFromSelect);

export function insertNameFromSelect() {
  let firstName = this.value;
  let nameDiv = document.getElementById(`wrapper-${firstName}`);
  if (this.parentNode.id === "name-list") {
    document.getElementById("participants").appendChild(nameDiv);
  } else {
    this.previousElementSibling.appendChild(nameDiv);
  }
  this.value = "default";
}

export function deleteHouse() {
  const houseDiv = this.closest('.household') || this.parentNode;
  const nameContainer = houseDiv.querySelector('.name-container');
  const participants = document.getElementById('participants');

  // Move all name wrappers back to participants
  const nameWrappers = [...nameContainer.querySelectorAll('.name-wrapper')];
  nameWrappers.forEach(wrapper => {
    participants.appendChild(wrapper);
  });

  // Remove the house
  houseDiv.remove();
}

export function initEventListeners(){
  addEventListener(`name-list-select`, "change", insertNameFromSelect);
  addEventListener("addHouse", "click", addHouse);
}
