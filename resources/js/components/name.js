import {state, removeGiver} from "../state.js";
import {selectElement} from "../utils.js";
import {Events, stateEvents} from "../events.js";

export function init() {
  stateEvents.on(Events.GIVER_ADDED, () => renderParticipantsSlot());
  stateEvents.on(Events.GIVER_REMOVED, () => renderParticipantsSlot());
  stateEvents.on(Events.NAME_ADDED_TO_HOUSE, ({houseID, members}) => {
    renderHouseSlot(houseID, members);
    renderParticipantsSlot();
  });
  stateEvents.on(Events.NAME_REMOVED_FROM_HOUSE, ({houseID, members}) => {
    renderHouseSlot(houseID, members);
    renderParticipantsSlot();
  });
}

function renderHouseSlot(houseID, members) {
  const slot = selectElement(`[data-slot="names-${houseID}"]`);
  if (slot) renderIntoSlot(slot, members);
}

function renderParticipantsSlot() {
  const slot = selectElement('[data-slot="names-participants"]');
  if (!slot) return;

  const namesInHouses = Object.values(state.houses).flat();
  const names = state.givers
    .map(g => g.name)
    .filter(name => !namesInHouses.includes(name));

  renderIntoSlot(slot, names);
}

function renderIntoSlot(slot, names) {
  slot.innerHTML = names.map(name => template(name)).join('');
  attachListeners(slot);
}

function template(name) {
  const id = state.nameNumber++;
  return `
      <div class="name-wrapper" id="wrapper-${name}" draggable="true">
        <button id="delete-${name}${id}" class="delete-name">X</button>
        <p class="name-entered" id="${name}${id}">${name}</p>
        <br id="br${name}${id}">
      </div>`;
}

function attachListeners(container) {
  container.querySelectorAll('.delete-name').forEach(btn => {
    btn.addEventListener('click', (event) => {
      const name = event.currentTarget.nextElementSibling.innerHTML;
      removeGiver(name);
    });
  });
}
