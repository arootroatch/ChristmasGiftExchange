import {addKeybinding, addEventListener, click, removeKeybinding, selectElement} from "../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents, isGenerated, nextStep} from "../../exchangeState.js";
import {showError} from "../Snackbar.js";

const nextStepId = "nextStep";
const slotSelector = '[data-slot="nextStep"]';

let currentStep;
let currentParticipantsLength;

function enterNextStep(evt) {
  if (evt.altKey && evt.keyCode === 13) {
    evt.preventDefault();
    click(`#${nextStepId}`);
  }
}

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, ({step, participants}) => {
    currentStep = step;
    currentParticipantsLength = participants.length;
    render();
  });
  stateEvents.on(Events.NEXT_STEP, ({step, isSecretSanta, participants}) => {
    currentStep = step;
    currentParticipantsLength = participants.length;
    if (step >= 1 && step <= 3 && !(step === 3 && isSecretSanta)) {
      render();
    } else {
      remove();
    }
  });
  stateEvents.on(Events.PARTICIPANT_ADDED, ({participants}) => {
    currentParticipantsLength = participants.length;
  });
  stateEvents.on(Events.PARTICIPANT_REMOVED, ({participants}) => {
    currentParticipantsLength = participants.length;
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
  if (currentParticipantsLength < 1 && currentStep === 1) {
    showError("Please add participant names");
    return;
  }
  if (currentStep === 3 && !isGenerated()) {
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
