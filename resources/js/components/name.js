import state, {addGiver, removeGiver, removeNameFromHouse} from "../state.js";
import {addEventListener, selectElement} from "../utils.js";
import {registerComponent} from "../render.js";

const participantsId = "participants";
const b0Id = "b0";

export function init() {
  registerComponent('name', nameRenderer);
  addEventListener(`#${b0Id}`, "click", addName);
}

const nameRenderer = {
  onComponentAdded(event) {
    if (event.type === 'name') this.renderParticipantsList();
  },

  onComponentRemoved(event) {
    if (event.type === 'name') this.renderParticipantsList();
  },

  onComponentUpdated(event) {
    if (event.type === 'name-list') {
      const slot = selectElement(`[data-slot="${event.id}"]`);
      if (slot && event.containerID) {
        this.renderIntoSlot(slot, event.containerID, event.data || []);
      }
    }

    if (event.type === 'name' && event.id === 'participants') {
      this.renderParticipantsList();
    }
  },

  renderParticipantsList() {
    const participants = selectElement(`#${participantsId}`);
    if (!participants) return;

    const namesInHouses = Object.values(state.houses).flat();
    const namesInMainList = state.givers
      .map(g => g.name)
      .filter(name => !namesInHouses.includes(name));

    participants.innerHTML = namesInMainList
      .map(name => this.template(name))
      .join('');

    this.attachListeners(participants);
  },

  renderIntoSlot(slot, containerID, names) {
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
      btn.addEventListener('click', deleteName);
    });
  }
};


export class Giver {
  constructor(name, recipient = "", email = "") {
    this.name = name;
    this.email = email;
    this.recipient = recipient;
    this.date = "";
    this.id = "";
  }
}

export function addName() {
  const nameInput = this.previousElementSibling;
  let name = nameInput.value;

  if (name !== "") {
    name = name.charAt(0).toUpperCase() + name.slice(1);
    addGiver(name);
    nameInput.value = "";
  }
}

export function deleteName() {
  const name = this.nextElementSibling.innerHTML;

  const nameWrapper = this.parentNode;
  const container = nameWrapper.parentNode;
  const house = container.closest('.household');
  const houseID = house?.id;

  if (houseID) {
    removeNameFromHouse(houseID, name);
  }
  removeGiver(name);
}
