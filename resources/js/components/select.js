import {registerComponent} from "../render.js";
import {addEventListener} from "../utils.js";
import {insertNameFromSelect} from "./house.js";
import state from "../state.js";

export function init() {
  registerComponent('select', selectRenderer);
}

const selectRenderer = {
  onComponentAdded(event) {
    if (event.type === 'name') this.updateAllSelects();
    if (event.type === 'house') {
      const slot = document.querySelector(`[data-slot="select-${event.id}"]`);
      if (slot) this.renderIntoSlot(slot, state.givers);
    }
  },

  onComponentRemoved(event) {
    if (event.type === 'name') this.updateAllSelects();
  },

  onComponentUpdated(event) {
    if (event.type === 'house') {
      const slot = document.querySelector(`[data-slot="select-${event.id}"]`);
      if (slot) this.renderIntoSlot(slot, state.givers);
    }
  },

  updateAllSelects() {
    const slots = document.querySelectorAll('[data-slot^="select-"]');
    slots.forEach(slot => this.renderIntoSlot(slot, state.givers));
    this.updateNameListSelect();
  },

  updateNameListSelect() {
    const nameListSelect = document.querySelector('#name-list-select');
    if (!nameListSelect) return;

    nameListSelect.innerHTML = `
      ${this.defaultOption}
      ${this.allNameOptions(state.givers)}`;
  },

  renderIntoSlot(slot, givers) {
    const slotId = slot.getAttribute('data-slot');
    const houseID = slotId.replace('select-', '');
    let select = slot.querySelector(`#${houseID}-select`);

    if (!select) {
      slot.innerHTML = this.template(houseID, givers);
      addEventListener(`#${houseID}-select`, 'change', insertNameFromSelect);
    } else {
      select.innerHTML = `
        ${this.defaultOption}
        ${this.allNameOptions(givers)}`;
    }
  },

  template(houseID, givers) {
    return `
      <select class="name-select" id="${houseID}-select">
        ${this.defaultOption}
        ${this.allNameOptions(givers)}
      </select>`;
  },

  allNameOptions(givers) {
    return givers.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
  },

  defaultOption() {
    return `<option value="default" selected="selected">-- Select a name --</option>`
  }
};
