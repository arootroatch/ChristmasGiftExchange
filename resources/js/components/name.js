import state, {removeGiver} from "../state.js";
import {selectElement} from "../utils.js";
import {registerComponent} from "../render.js";

export function init() {
  registerComponent('name', nameRenderer);
}

const nameRenderer = {
  onComponentAdded(event) {
    if (event.type === 'name') this.renderParticipantsSlot();
  },

  onComponentRemoved(event) {
    if (event.type === 'name') this.renderParticipantsSlot();
  },

  onComponentUpdated(event) {
    if (event.type === 'house') {
      const slot = selectElement(`[data-slot="names-${event.id}"]`);
      if (slot) {
        this.renderIntoSlot(slot, event.data || []);
      }
      this.renderParticipantsSlot();
    }

    if (event.type === 'name' && event.id === 'participants') {
      this.renderParticipantsSlot();
    }
  },

  renderParticipantsSlot() {
    const slot = selectElement('[data-slot="names-participants"]');
    if (!slot) return;

    const namesInHouses = Object.values(state.houses).flat();
    const names = state.givers
      .map(g => g.name)
      .filter(name => !namesInHouses.includes(name));

    this.renderIntoSlot(slot, names);
  },

  renderIntoSlot(slot, names) {
    slot.innerHTML = names.map(name => this.template(name)).join('');
    this.attachListeners(slot);
  },

  template(name) {
    const id = state.nameNumber++;
    return `
      <div class="name-wrapper" id="wrapper-${name}" draggable="true">
        <button id="delete-${name}${id}" class="delete-name">X</button>
        <p class="name-entered" id="${name}${id}">${name}</p>
        <br id="br${name}${id}">
      </div>`;
  },

  attachListeners(container) {
    container.querySelectorAll('.delete-name').forEach(btn => {
      btn.addEventListener('click', (event) => {
        const name = event.currentTarget.nextElementSibling.innerHTML;
        removeGiver(name);
      });
    });
  }
};
