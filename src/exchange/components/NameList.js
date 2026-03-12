import {ExchangeEvents as Events, exchangeEvents as stateEvents, addParticipant} from "../state.js";
import {addEventListener, leftContainerId, nameListId, participantsId, selectElement, unshiftHTML} from "../../utils.js";
import {insertNameFromSelect} from "./Select.js";

const addNameBtnId = "add-name-btn";
const nameInputId = "name-input";

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    if (selectElement(`#${nameListId}`)) return;
    unshiftHTML(`#${leftContainerId}`, template());
    attachListeners();
    const list = selectElement(`#${nameListId}`);
    if (list) list.style.display = "block";
  });
}

function template() {
  return `
  <div id="${nameListId}" style="display: none;">
    <h2 id="house1-header">Participant Names</h2>
    <div class="name-container" id="${participantsId}" data-slot="names-${participantsId}"></div>
    <label for="name-input">Name</label>
    <input type="text" id="name-input" class="name-input" placeholder="Aunt Cathy" />
    <button class="button" type="submit" id="add-name-btn">Add Name (Enter)</button>
    <select class="name-select" name="name-list-select" id="name-list-select">
      <option disabled selected value="default">-- Select a name --</option>
    </select>
  </div>`;
}

function attachListeners() {
  addEventListener(`#${addNameBtnId}`, "click", () => {
    const nameInput = selectElement(`#${nameInputId}`);
    const name = nameInput.value.trim();
    if (name !== "") {
      addParticipant(name.charAt(0).toUpperCase() + name.slice(1));
      nameInput.value = "";
    }
  });
  addEventListener(`#${nameInputId}`, "keyup", (evt) => {
    if (evt.keyCode === 13) {
      evt.preventDefault();
      selectElement(`#${addNameBtnId}`)?.click();
    }
  });
  addEventListener("#name-list-select", "change", insertNameFromSelect);
}
