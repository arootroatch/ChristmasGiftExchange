import {addKeybinding, addEventListener, click, removeKeybinding, selectElement} from "../../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents, assignRecipients} from "../../state.js";
import {generate} from "../../generate.js";
import {showError} from "../../../Snackbar.js";
import * as self from "./GenerateButton.js";

const generateId = "generate";
const slotSelector = '[data-slot="generate"]';

let participantCount = 0;
let hintShown = false;
let initialized = false;

const glowClasses = ["generate-glow-1", "generate-glow-2", "generate-glow-3"];

export function getGlowClass(count) {
  if (count >= 8) return glowClasses[2];
  if (count >= 5) return glowClasses[1];
  if (count >= 3) return glowClasses[0];
  return null;
}

function updateHint(text) {
  const hint = selectElement("#generate-hint");
  if (hint) hint.textContent = text;
}

function enterGenerate(evt) {
  if (evt.ctrlKey && evt.keyCode === 13) {
    evt.preventDefault();
    click(`#${generateId}`);
  }
}

export function init() {
  if (initialized) return;
  initialized = true;
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    participantCount = 0;
    hintShown = false;
    remove();
    updateHint("");
  });
  stateEvents.on(Events.PARTICIPANT_ADDED, () => {
    participantCount++;
    render();
    if (!hintShown && participantCount >= 3) {
      hintShown = true;
      updateHint("When you're ready, click here!");
    }
  });
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isSecretSanta}) => {
    if (isSecretSanta) {
      remove();
      updateHint("");
    } else {
      updateHint("Click as many times as you like to see different combinations!");
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
