import {addKeybinding, addEventListener, click, removeKeybinding, selectElement} from "../../utils.js";
import {Events, stateEvents} from "../../Events.js";
import {isGenerated, nextStep, state} from "../../state.js";
import {showError} from "../Snackbar.js";

const nextStepId = "nextStep";
const slotSelector = '[data-slot="nextStep"]';

function enterNextStep(evt) {
  if (evt.altKey && evt.keyCode === 13) {
    evt.preventDefault();
    click(`#${nextStepId}`);
  }
}

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    render();
  });
  stateEvents.on(Events.NEXT_STEP, () => {
    if (state.step >= 1 && state.step <= 3 && !(state.step === 3 && state.isSecretSanta)) {
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
    <button class="btn-bottom" id="${nextStepId}">
      Next Step<br /><span class="shortcut">(Alt+Enter)</span>
    </button>
  `;
}

function introNext() {
  if (state.givers.length < 1 && state.step === 1) {
    showError("Please add participant names");
    return;
  }
  if (state.step === 3 && !isGenerated()) {
    showError('Please click "Generate List"');
    return;
  }
  nextStep();
}

function render() {
  const slot = selectElement(slotSelector);
  if (!slot || slot.querySelector(`#${nextStepId}`)) return;
  slot.innerHTML = template();
  addEventListener(`#${nextStepId}`, "click", introNext);
  removeKeybinding(enterNextStep);
  addKeybinding(enterNextStep);
}

function remove() {
  const slot = selectElement(slotSelector);
  if (slot) slot.innerHTML = "";
  removeKeybinding(enterNextStep);
}
