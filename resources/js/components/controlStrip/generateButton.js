import {addKeybinding, addEventListener, click, removeKeybinding, selectElement} from "../../utils.js";
import {Events, stateEvents} from "../../events.js";
import {generateList} from "../../generate.js";
import {state} from "../../state.js";

const generateId = "generate";
const slotSelector = '[data-slot="generate"]';

function enterGenerate(evt) {
  if (evt.ctrlKey && evt.keyCode === 13) {
    evt.preventDefault();
    click(`#${generateId}`);
  }
}

export function init() {
  stateEvents.on(Events.NEXT_STEP, () => {
    if (state.step === 3) {
      render();
    } else {
      remove();
    }
  });
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isSecretSanta}) => {
    if (isSecretSanta) {
      remove();
    }
  });
}

function template() {
  return `
    <button class="btn-bottom" id="${generateId}">
      Generate List<br /><span class="shortcut">(Ctrl+Enter)</span>
    </button>
  `;
}

function render() {
  const slot = selectElement(slotSelector);
  if (!slot || slot.querySelector(`#${generateId}`)) return;
  slot.innerHTML = template();
  addEventListener(`#${generateId}`, "click", generateList);
  addKeybinding(enterGenerate);
}

function remove() {
  const slot = selectElement(slotSelector);
  if (slot) slot.innerHTML = "";
  removeKeybinding(enterGenerate);
}
