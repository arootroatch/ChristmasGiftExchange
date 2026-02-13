import {addEventListener, click, selectElement} from "../utils.js";
import {Events, stateEvents} from "../events.js";
import {generateList} from "../generate.js";
import {showError} from "./snackbar.js";
import {addHouseToState, isGenerated, nextStep, state} from "../state.js";

const controlStripId = "control-strip";
const generateId = "generate";
const addHouseId = "addHouse";
const nextStepId = "nextStep";

export function isMobileDevice(userAgent = navigator.userAgent) {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

function enterAddHouse(evt) {
  if (evt.shiftKey && evt.keyCode === 13) {
    evt.preventDefault();
    click(`#${addHouseId}`);
  }
}

function enterGenerate(evt) {
  if (evt.ctrlKey && evt.keyCode === 13) {
    evt.preventDefault();
    click(`#${generateId}`);
  }
}

function addKeybinding(handler) {
  if (!isMobileDevice()) {
    window.addEventListener("keyup", handler);
  }
}

function removeKeybinding(handler) {
  window.removeEventListener("keyup", handler);
}

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    render();
  });
  stateEvents.on(Events.NEXT_STEP, () => {
    updateVisibility();
  });
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isSecretSanta}) => {
    if (isSecretSanta) {
      selectElement(`#${nextStepId}`).style.display = "none";
      selectElement(`#${generateId}`).style.display = "none";
      removeKeybinding(enterGenerate);
    }
  });
}

function template() {
  return `
    <div id="${controlStripId}">
      <div id="btn-div">
        <button
          class="btn-bottom"
          id="${generateId}"
          style="display: none"
        >
          Generate List<br /><span class="shortcut">(Ctrl+Enter)</span>
        </button>
        <button
          class="btn-bottom"
          id="${addHouseId}"
          style="display: none"
        >
          Add Group<br /><span class="shortcut">(Shift+Enter)</span>
        </button>
        <button
          class="btn-bottom"
          id="${nextStepId}"
          style="display: none;"
        >
          Next Step
        </button>
      </div>
    </div>
  `;
}

function attachListeners() {
  addEventListener(`#${generateId}`, "click", generateList);
  addEventListener(`#${addHouseId}`, "click", addHouse);
  addEventListener(`#${nextStepId}`, "click", introNext);
}

function addHouse() {
  const houseNumber = Object.keys(state.houses).length;
  const houseID = `house-${houseNumber}`;
  addHouseToState(houseID);
}

function introNext() {
  if (state.givers.length < 1 && state.step === 1) {
    showError("Please add participant names");
    return;
  }
  if (state.step === 3 && !isGenerated()) {
    showError(`Please click "Generate List"`);
    return;
  }
  if (state.step === 3 && isGenerated()) {
    selectElement(`#${nextStepId}`).style.display = "none";
  }
  nextStep();
}

function updateVisibility() {
  const next = selectElement(`#${nextStepId}`);
  const addHouse = selectElement(`#${addHouseId}`);
  const generate = selectElement(`#${generateId}`);

  if (!next || !addHouse || !generate) return;

  switch (state.step) {
    case 0:
      break;
    case 1:
      next.style.display = "block";
      addHouse.style.display = "none";
      removeKeybinding(enterAddHouse);
      break;
    case 2:
      next.style.display = "block";
      addHouse.style.display = "block";
      addKeybinding(enterAddHouse);
      generate.style.display = "none";
      removeKeybinding(enterGenerate);
      break;
    case 3:
      next.style.display = "block";
      addHouse.style.display = "none";
      removeKeybinding(enterAddHouse);
      generate.style.display = "block";
      addKeybinding(enterGenerate);
      if (state.isSecretSanta) next.style.display = "none";
      break;
    case 4:
      next.style.display = "none";
      generate.style.display = "none";
      removeKeybinding(enterGenerate);
      break;
  }
}

function render() {
  if (selectElement(`#${controlStripId}`)) return;
  const container = selectElement("#container");
  if (!container) return;
  container.insertAdjacentHTML("beforebegin", template());
  attachListeners();
  updateVisibility();
}
