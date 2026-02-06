import {showEmailTable} from "./components/emailTable"
import state, {isGenerated} from "./state.js";
import {showError} from "./components/snackbar";
import {selectElement} from "./utils";

const nextStepId = "nextStep";
const addHouseId = "addHouse";
const generateId = "generate";
const nameListId = "name-list";
const resultsTableId = "results-table";
const introId = "intro";
const leftContainerId = "left-container";
const letsGoId = "letsGo";
const secretSantaBtnId = "secretSantaBtn";

const introArr = [
  ``,

  `<span style="font-weight:bold">Step 1 / 4:</span> Enter the names of everyone participating in the gift exchange. Make sure all names are unique. If two people have the same name, please add a last initial or nickname.`,

  `<span style="font-weight:bold">Step 2 / 4</span> (optional): Who should NOT get who? <br><br>For example, a couple may not want to be able to get each other's names at the family gift exchange because they will already be getting each other gifts outside the exchange. <br><br> In that case, you can put them in an exclusion group together. Names in the same group will not get each other as recipients.<br><br> Click "Add Group." Then,  you can drag and drop to move people around or select their name from the drop-down in each box.`,

  `<span style="font-weight:bold">Step 3 / 4:</span> Click "Generate List!"`,
];

export function conditionalRender() {
  const next = selectElement(`#${nextStepId}`);
  const addHouse = selectElement(`#${addHouseId}`);
  const generate = selectElement(`#${generateId}`);

  switch (state.introIndex) {
    case 0:
      break;
    case 1:
      addHouse.style.display = "none";
      break;
    case 2:
      addHouse.style.display = "block";
      generate.style.display = "none";
      break;
    case 3:
      addHouse.style.display = "none";
      generate.style.display = "block";
      if (state.isSecretSanta) next.style.display = "none";
      break;
    case 4:
      generate.style.display = "none";
      break;
  }
}

export function stepOne() {
  selectElement(`#${nameListId}`).style.display = "block";
  if (!state.isSecretSanta) {
    selectElement(`#${resultsTableId}`).style.display = "table";
  }
  selectElement(`#${nextStepId}`).style.display = "block";
  introNext();
}

export function introNext() {
  if (state.givers.length < 1 && state.introIndex === 1) {
    showError("Please add participant names");
    return;
  }
  if (state.introIndex === 3 && !isGenerated()) {
    showError(`Please click "Generate List"`);
    return;
  }
  if (state.introIndex === 3 && isGenerated()) {
    showEmailTable();
    selectElement(`#${nextStepId}`).style.display = "none";
  }
  state.introIndex + 1 > introArr.length ? (state.introIndex = 0) : state.introIndex++;
  const introDiv = selectElement(`#${introId}`);
  if (state.introIndex < introArr.length) {
    introDiv.innerHTML = `<p>${introArr[state.introIndex]}</p>`;
  }
  conditionalRender();
}

export function secretSantaMode() {
  state.isSecretSanta = true;
  selectElement(`#${leftContainerId}`).classList.add("secret");
  stepOne();
}

if (typeof document !== 'undefined') {
  const nextStep = selectElement(`#${nextStepId}`);
  const letsGo = selectElement(`#${letsGoId}`);
  const secretSantaBtn = selectElement(`#${secretSantaBtnId}`);

  if (nextStep) nextStep.addEventListener('click', introNext);
  if (letsGo) letsGo.addEventListener('click', stepOne);
  if (secretSantaBtn) secretSantaBtn.addEventListener('click', secretSantaMode);
}

