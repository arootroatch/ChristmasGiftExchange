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
      <div class="name-wrapper entry-row" id="wrapper-${safe}" draggable="true">
        <span class="name-entered" id="${safe}${id}">${safe}</span>
        <button id="delete-${safe}${id}" class="delete-btn">&#10005;</button>
      </div>`;
}

function attachListeners(container) {
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (event) => {
      const name = event.currentTarget.previousElementSibling.textContent;
      removeParticipant(name);
    });
  });
}
