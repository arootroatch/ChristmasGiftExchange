import {addKeybinding, addEventListener, click, removeKeybinding, selectElement} from "../../utils.js";
import {Events, stateEvents} from "../../Events.js";
import {addHouseToState, state} from "../../state.js";

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
  stateEvents.on(Events.NEXT_STEP, () => {
    if (state.step === 2 || state.step === 3) {
      render();
    } else {
      remove();
    }
  });
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isSecretSanta}) => {
    if (!isSecretSanta) {
      remove();
    }
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
  const houseNumber = Object.keys(state.houses).length;
  const houseID = `house-${houseNumber}`;
  addHouseToState(houseID);
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
