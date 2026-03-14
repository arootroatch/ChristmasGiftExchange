import {addKeybinding, addEventListener, click, removeKeybinding, selectElement} from "../../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents, addHouseToState} from "../../state.js";

const addHouseId = "addHouse";
const slotSelector = '[data-slot="addHouse"]';

function enterAddHouse(evt) {
  if (evt.shiftKey && evt.keyCode === 13) {
    evt.preventDefault();
    click(`#${addHouseId}`);
  }
}

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    remove();
  });
  stateEvents.on(Events.PARTICIPANT_ADDED, () => {
    render();
  });
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isSecretSanta}) => {
    if (isSecretSanta) remove();
  });
}

function template() {
  return `
    <button class="btn-bottom" id="${addHouseId}">
      Add Group<br /><span class="shortcut">(Shift+Enter)</span>
    </button>
  `;
}

function addHouse() {
  addHouseToState();
}

function render() {
  const slot = selectElement(slotSelector);
  if (!slot || slot.querySelector(`#${addHouseId}`)) return;
  slot.innerHTML = template();
  addEventListener(`#${addHouseId}`, "click", addHouse);
  addKeybinding(enterAddHouse);
}

function remove() {
  const slot = selectElement(slotSelector);
  if (slot) slot.innerHTML = "";
  removeKeybinding(enterAddHouse);
}
