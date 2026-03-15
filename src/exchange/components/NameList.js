import {ExchangeEvents as Events, exchangeEvents as stateEvents, addParticipant} from "../state.js";
import {addEventListener, leftContainerId, nameListId, participantsId, selectElement, unshiftHTML} from "../../utils.js";
import {insertNameFromSelect} from "./Select.js";

const addNameBtnId = "add-name-btn";
const nameInputId = "name-input";
let ghostTextRemoved = false;

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    ghostTextRemoved = false;
    if (selectElement(`#${nameListId}`)) {
      restoreGhostText();
      return;
    }
    unshiftHTML(`#${leftContainerId}`, template());
    attachListeners();
    const list = selectElement(`#${nameListId}`);
    if (list) list.style.display = "block";
  });

  stateEvents.on(Events.PARTICIPANT_ADDED, () => {
    if (ghostTextRemoved) return;
    ghostTextRemoved = true;
    const ghost = selectElement(`#${nameListId} .ghost-text`);
    if (ghost) ghost.remove();
  });
}

function template() {
  return `
  <div id="${nameListId}" style="display: none;">
    <h2 id="house1-header">Participant Names</h2>
    ${ghostTextHTML}
    <div class="name-container" id="${participantsId}" data-slot="names-${participantsId}"></div>
    <label for="name-input">Name</label>
    <input type="text" id="name-input" class="name-input" placeholder="Aunt Cathy" />
    <button class="button" type="submit" id="add-name-btn">Add Name <span class="shortcut">(Enter)</span></button>
    <select class="name-select" name="name-list-select" id="name-list-select">
      <option disabled selected value="default">-- Select a name --</option>
    </select>
  </div>`;
}

const ghostTextHTML = `<p class="ghost-text">Enter the names of everyone participating in the gift exchange. Make sure all names are unique — if two people share a name, add a last initial or nickname.</p>`;

function restoreGhostText() {
  const nameList = selectElement(`#${nameListId}`);
  if (nameList && !selectElement(`#${nameListId} .ghost-text`)) {
    const header = selectElement(`#${nameListId} h2`);
    if (header) header.insertAdjacentHTML("afterend", ghostTextHTML);
  }
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
