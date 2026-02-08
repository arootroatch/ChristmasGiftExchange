import {addGiver} from "../state.js";
import {addEventListener, selectElement, unshiftHTML} from "../utils.js";
import {registerComponent} from "../render.js";

const b0Id = "b0";
const inputId = "input0";
const leftContainerId = "left-container";

const nameListRenderer = {
  onComponentAdded(event) {
    if (event.type !== 'name-list') return;
    unshiftHTML(`#${leftContainerId}`, this.template());
    this.attachListeners();
  },

  onComponentRemoved(event) {},
  onComponentUpdated(event) {},

  template() {
    return `
      <div id="name-list" style="display: none;">
        <h2 id="house1-header">Participant Names</h2>
        <div class="name-container" id="participants" data-slot="names-participants"></div>
        <input type="text" id="${inputId}" class="name-input" />
        <button class="button" type="submit" id="${b0Id}">Add Name (Enter)</button>
        <select class="name-select" name="name-list-select" id="name-list-select">
          <option disabled selected value="default">-- Select a name --</option>
        </select>
      </div>`;
  },

  attachListeners() {
    addEventListener(`#${b0Id}`, "click", () => {
      const nameInput = selectElement(`#${inputId}`);
      const name = nameInput.value;
      if (name !== "") {
        addGiver(name.charAt(0).toUpperCase() + name.slice(1));
        nameInput.value = "";
      }
    });
  }
};

export function init() {
  registerComponent('nameList', nameListRenderer);
  nameListRenderer.attachListeners();
}