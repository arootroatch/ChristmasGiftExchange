import {ExchangeEvents as Events, exchangeEvents as stateEvents, removeParticipant, nextNameNumber} from "../state.js";
import {participantsId, selectElement, escapeAttr} from "../../utils.js";

export function init() {
  stateEvents.on(Events.PARTICIPANT_ADDED, ({houses, participants}) => renderParticipantsSlot(houses, participants));
  stateEvents.on(Events.PARTICIPANT_REMOVED, ({houses, participants}) => renderParticipantsSlot(houses, participants));
  stateEvents.on(Events.NAME_ADDED_TO_HOUSE, ({houseID, members, houses, participants}) => {
    renderHouseSlot(houseID, members);
    renderParticipantsSlot(houses, participants);
  });
  stateEvents.on(Events.NAME_REMOVED_FROM_HOUSE, ({houseID, members, houses, participants}) => {
    renderHouseSlot(houseID, members);
    renderParticipantsSlot(houses, participants);
  });
}

function renderHouseSlot(houseID, members) {
  const slot = selectElement(`[data-slot="names-${houseID}"]`);
  if (slot) renderIntoSlot(slot, members);
}

function renderParticipantsSlot(houses, participants) {
  const slot = selectElement(`[data-slot="names-${participantsId}"]`);
  if (!slot) return;
  const namesInHouses = houses.flatMap(h => h.members);
  const names = participants
    .map(p => p.name)
    .filter(name => !namesInHouses.includes(name));
  renderIntoSlot(slot, names);
}

function renderIntoSlot(slot, names) {
  slot.innerHTML = names.map(name => template(name)).join('');
  attachListeners(slot);
}

function template(name) {
  const id = nextNameNumber();
  const safe = escapeAttr(name);
  return `
      <div class="name-wrapper" id="wrapper-${safe}" draggable="true">
        <button id="delete-${safe}${id}" class="delete-name">X</button>
        <p class="name-entered" id="${safe}${id}">${safe}</p>
        <br id="br${safe}${id}">
      </div>`;
}

function attachListeners(container) {
  container.querySelectorAll('.delete-name').forEach(btn => {
    btn.addEventListener('click', (event) => {
      const name = event.currentTarget.nextElementSibling.innerHTML;
      removeParticipant(name);
    });
  });
}
