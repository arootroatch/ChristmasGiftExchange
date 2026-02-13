import {addGiver} from "../state.js";
import {addEventListener, selectElement, unshiftHTML} from "../utils.js";
import {insertNameFromSelect} from "./select.js";
import {Events, stateEvents} from "../events.js";

const b0Id = "b0";
const inputId = "input0";
const nameListId = "name-list";

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    if (selectElement(`#${nameListId}`)) return;
    unshiftHTML('#left-container', template());
    attachListeners();
    const list = selectElement(`#${nameListId}`);
    if (list) list.style.display = "block";
  });
}

function template() {
  return `
  <div id="${nameListId}" style="display: none;">
    <h2 id="house1-header">Participant Names</h2>
    <div class="name-container" id="participants" data-slot="names-participants"></div>
    <input type="text" id="input0" class="name-input" />
    <button class="button" type="submit" id="b0">Add Name (Enter)</button>
    <select class="name-select" name="name-list-select" id="name-list-select">
      <option disabled selected value="default">-- Select a name --</option>
    </select>
  </div>`;
}

function attachListeners() {
  addEventListener(`#${b0Id}`, "click", () => {
    const nameInput = selectElement(`#${inputId}`);
    const name = nameInput.value;
    if (name !== "") {
      addGiver(name.charAt(0).toUpperCase() + name.slice(1));
      nameInput.value = "";
    }
  });
  addEventListener(`#${inputId}`, "keyup", (evt) => {
    if (evt.keyCode === 13) {
      evt.preventDefault();
      selectElement(`#${b0Id}`)?.click();
    }
  });
  addEventListener("#name-list-select", "change", insertNameFromSelect);
}
