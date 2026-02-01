import { registerComponent } from "../render.js";
import state from "../state.js";

// Generic lifecycle - renders select dropdowns into slots
const selectRenderer = {
  onComponentAdded(event) {
    // When a name is added, update all select dropdowns
    if (event.type === 'name') {
      this.updateAllSelects();
    }
  },

  onComponentRemoved(event) {
    // When a name is removed, update all select dropdowns
    if (event.type === 'name') {
      this.updateAllSelects();
    }
  },

  onComponentUpdated(event) {
    // Listen for select slot updates from house component
    if (event.type === 'select') {
      const slot = document.querySelector(`[data-slot="${event.id}"]`);
      if (slot) {
        this.renderIntoSlot(slot, event.data || []);
      }
    }
  },

  updateAllSelects() {
    // Find all select slots and re-render them
    const slots = document.querySelectorAll('[data-slot^="select-"]');
    slots.forEach(slot => {
      this.renderIntoSlot(slot, state.givers);
    });

    // Also update the main name-list-select dropdown
    this.updateNameListSelect();
  },

  updateNameListSelect() {
    const nameListSelect = document.querySelector('#name-list-select');
    if (!nameListSelect) return;

    const options = state.givers
      .map(g => `<option value="${g.name}">${g.name}</option>`)
      .join('');

    nameListSelect.innerHTML = `
      <option value="default" selected="selected">-- Select a name --</option>
      ${options}`;
  },

  renderIntoSlot(slot, givers) {
    // Get the house ID from the slot's data-slot attribute
    // e.g., "select-house-0" -> "house-0"
    const slotId = slot.getAttribute('data-slot');
    const houseID = slotId.replace('select-', '');

    // Check if select already exists in the slot
    let select = slot.querySelector(`#${houseID}-select`);

    if (!select) {
      // First render - create the select element
      slot.innerHTML = this.template(houseID, givers);
    } else {
      // Update existing select - just update options to preserve event listeners
      const options = givers
        .map(g => `<option value="${g.name}">${g.name}</option>`)
        .join('');

      select.innerHTML = `
        <option value="default" selected="selected">-- Select a name --</option>
        ${options}`;
    }
  },

  template(houseID, givers) {
    const options = givers
      .map(g => `<option value="${g.name}">${g.name}</option>`)
      .join('');

    return `
      <select class="name-select" id="${houseID}-select">
        <option value="default" selected="selected">-- Select a name --</option>
        ${options}
      </select>`;
  }
};

// Initialize
export function init() {
  registerComponent('select', selectRenderer);
}
