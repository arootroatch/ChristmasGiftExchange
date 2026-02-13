import {addKeybinding, addEventListener, click, removeKeybinding, selectElement} from "../../utils.js";
import {Events, stateEvents} from "../../events.js";
import {generate} from "../../generate.js";
import {assignRecipients, state} from "../../state.js";
import {showError} from "../snackbar.js";
import * as self from "./generateButton.js";

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
