import {Events, stateEvents} from "../Events.js";
import {state} from "../state.js";
import {selectElement} from "../utils.js";

export const instructions = [
  `<span style="font-weight:bold">Step 1 / 4:</span> Enter the names of everyone participating in the gift exchange. Make sure all names are unique. If two people have the same name, please add a last initial or nickname.`,
  `<span style="font-weight:bold">Step 2 / 4</span> (optional): Who should NOT get who? <br><br>For example, a couple may not want to be able to get each other's names at the family gift exchange because they will already be getting each other gifts outside the exchange. <br><br> In that case, you can put them in an exclusion group together. Names in the same group will not get each other as recipients.<br><br> Click "Add Group." Then,  you can drag and drop to move people around or select their name from the drop-down in each box.`,
  `<span style="font-weight:bold">Step 3 / 4:</span> Click "Generate List!"`,
];

const introId = "intro";

function renderInstructions() {
  if (!state || state.step < 1 || state.step > instructions.length) return;
  const introDiv = selectElement(`#${introId}`);
  if (!introDiv) return;
  introDiv.innerHTML = `<p>${instructions[state.step - 1]}</p>`;
}

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, renderInstructions);
  stateEvents.on(Events.NEXT_STEP, renderInstructions);
}
