import {addKeybinding, addEventListener, click, removeKeybinding, selectElement} from "../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents, assignRecipients} from "../../exchangeState.js";
import {generate} from "../../generate.js";
import {showError} from "../Snackbar.js";
import * as self from "./GenerateButton.js";

const generateId = "generate";
const slotSelector = '[data-slot="generate"]';

function enterGenerate(evt) {
  if (evt.ctrlKey && evt.keyCode === 13) {
    evt.preventDefault();
    click(`#${generateId}`);
  }
}

export function init() {
  stateEvents.on(Events.NEXT_STEP, ({step}) => {
    if (step === 3) {
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

export function generateList() {
  const {error, assignments} = generate();
  if (error) {
    showError(error);
    return;
  }
  assignRecipients(assignments);
}

function render() {
  const slot = selectElement(slotSelector);
  if (!slot || slot.querySelector(`#${generateId}`)) return;
  slot.innerHTML = template();
  addEventListener(`#${generateId}`, "click", self.generateList);
  addKeybinding(enterGenerate);
}

function remove() {
  const slot = selectElement(slotSelector);
  if (slot) slot.innerHTML = "";
  removeKeybinding(enterGenerate);
}
