import {addEventListener, selectElement} from "../utils.js";
import {Events, stateEvents} from "../events.js";
import {addHouse} from "./house.js";
import {generateList} from "../generate.js";
import {getInstructionsLength} from "./instructions.js";
import {showEmailTable} from "./emailTable.js";
import {showError} from "./snackbar.js";
import {isGenerated, nextStep, state} from "../state.js";

const controlStripId = "control-strip";
const generateId = "generate";
const addHouseId = "addHouse";
const nextStepId = "nextStep";

function template() {
  return `
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
  `;
}

function attachListeners() {
  addEventListener(`#${generateId}`, "click", generateList);
  addEventListener(`#${addHouseId}`, "click", addHouse);
  addEventListener(`#${nextStepId}`, "click", introNext);
}

export function introNext() {
  if (state.givers.length < 1 && state.step === 1) {
    showError("Please add participant names");
    return;
  }
  if (state.step === 3 && !isGenerated()) {
    showError(`Please click "Generate List"`);
    return;
  }
  if (state.step === 3 && isGenerated()) {
    showEmailTable();
    selectElement(`#${nextStepId}`).style.display = "none";
  }
  nextStep(getInstructionsLength());
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
      break;
    case 2:
      next.style.display = "block";
      addHouse.style.display = "block";
      generate.style.display = "none";
      break;
    case 3:
      next.style.display = "block";
      addHouse.style.display = "none";
      generate.style.display = "block";
      if (state.isSecretSanta) next.style.display = "none";
      break;
    case 4:
      next.style.display = "block";
      generate.style.display = "none";
      break;
  }
}

function render() {
  const container = selectElement(`#${controlStripId}`);
  if (!container) return;
  if (container.querySelector(`#${generateId}`)) return;
  container.innerHTML = template();
  attachListeners();
  updateVisibility();
}

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    render();
  });
  stateEvents.on(Events.NEXT_STEP, () => {
    updateVisibility();
  });
}
