import {
  ExchangeEvents as Events,
  exchangeEvents as stateEvents,
  addHouseToState,
} from "../state.js";
import {addKeybinding, leftContainerId, pushHTML, removeKeybinding, selectElement} from "../../utils.js";

const ghostHouseId = "ghost-house";
const btnClass = "ghost-house-btn";
let participantCount = 0;
let houseCount = 0;
let rendered = false;
let initialized = false;

function enterAddHouse(evt) {
  if (evt.shiftKey && evt.keyCode === 13) {
    evt.preventDefault();
    addHouseToState();
  }
}

function initialTemplate() {
  return `
    <div id="${ghostHouseId}" class="ghost-house">
      <p class="ghost-text">Want to prevent certain people from being matched?
      Create an exclusion group and drag their names in — or use the dropdown.</p>
      <button class="${btnClass}">+ Add Group</button>
      <span class="shortcut">(Shift+Enter)</span>
    </div>`;
}

function minimalTemplate() {
  return `
    <div id="${ghostHouseId}" class="ghost-house ghost-house-minimal">
      <button class="${btnClass}">+ Add another group</button>
      <span class="shortcut">(Shift+Enter)</span>
    </div>`;
}

function render(template) {
  remove();
  const container = selectElement(`#${leftContainerId}`);
  if (!container) return;
  pushHTML(`#${leftContainerId}`, template);
  const btn = selectElement(`#${ghostHouseId} .${btnClass}`);
  if (btn) btn.onclick = () => addHouseToState();
  addKeybinding(enterAddHouse);
  rendered = true;
}

function remove() {
  const el = selectElement(`#${ghostHouseId}`);
  if (el) el.remove();
  removeKeybinding(enterAddHouse);
}

function renderInitialOrMinimal() {
  render(houseCount > 0 ? minimalTemplate() : initialTemplate());
}

export function init() {
  if (initialized) return;
  initialized = true;

  stateEvents.on(Events.EXCHANGE_STARTED, ({isReuse}) => {
    participantCount = 0;
    houseCount = 0;
    rendered = false;
    remove();
    if (isReuse) {
      rendered = true;
    }
  });

  stateEvents.on(Events.PARTICIPANT_ADDED, () => {
    participantCount++;
    if (!rendered && participantCount >= 3) {
      renderInitialOrMinimal();
    }
  });

  stateEvents.on(Events.PARTICIPANT_REMOVED, () => {
    participantCount--;
  });

  stateEvents.on(Events.HOUSE_ADDED, () => {
    houseCount++;
    if (rendered) {
      renderInitialOrMinimal();
    }
  });

  stateEvents.on(Events.HOUSE_REMOVED, () => {
    houseCount--;
    if (rendered && selectElement(`#${ghostHouseId}`)) {
      renderInitialOrMinimal();
    }
  });

  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isSecretSanta}) => {
    if (isSecretSanta) {
      remove();
      rendered = false;
    }
  });
}
