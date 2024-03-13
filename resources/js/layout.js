import { showSnackbar, showEmailTable } from "./scripts.js";
import state from "./state.js";

document.getElementById('nextStep').addEventListener('click', introNext);
document.getElementById('letsGo').addEventListener('click', stepOne);
document.getElementById('secretSantaBtn').addEventListener('click', secretSantaMode);


function conditionalRender() {
  const next = document.getElementById("nextStep");
  const addHouse = document.getElementById("addHouse");
  const generate = document.getElementById("generate");
  const secretGenerate = document.getElementById("secretGenerate");

  switch (state.introIndex) {
    case 0:
      break;
    case 1:
      addHouse.style.display = "none";
      break;
    case 2:
      addHouse.style.display = "block";
      secretGenerate.style.display = "none";
      generate.style.display = "none";
      break;
    case 3:
      addHouse.style.display = "none";

      if (state.secretSanta) {
        secretGenerate.style.display = "block";
        generate.style.display = "none";
        next.style.display = "none";
      } else {
        generate.style.display = "block";
      }
      break;
    case 4:
      generate.style.display = "none";
      secretGenerate.style.display = "none";
      break;
  }
}

function stepOne() {
  document.getElementById("name-list").style.display = "block";
  if (!state.secretSanta) {
    document.getElementById("results-table").style.display = "table";
  }
  document.getElementById("nextStep").style.display = "block";
  introNext();
}

function introNext() {
  console.log(state.introIndex, state.generated)
  if (state.givers.length < 1 && state.introIndex === 1) {
    showSnackbar("Please add participant names", "error");
    return;
  }
  if (state.introIndex === 3 && !state.generated) {
    showSnackbar(`Please click "Generate List"`, "error");
    return;
  }
  if (state.introIndex === 3 && state.generated) {
    showEmailTable();
    document.getElementById("nextStep").style.display = "none";
  }
  state.introIndex + 1 > introArr.length ? (state.introIndex = 0) : state.introIndex++;
  const introDiv = document.getElementById("intro");
  if (state.introIndex < introArr.length) {
    introDiv.innerHTML = `<p>${introArr[state.introIndex]}</p>`;
  }
  conditionalRender();
}

const introArr = [
  ``,

  `<span style="font-weight:bold">Step 1 / 4:</span> Enter the names of everyone participating in the gift exchange. Make sure all names are unique. If two people have the same name, please add a last initial or nickname.`,

  `<span style="font-weight:bold">Step 2 / 4</span> (optional): Who should NOT get who? <br><br>For example, a couple may not want to be able get each others' names at the family gift exchange because they will already be getting each other gifts outside of the exchange. <br><br> In that case, you can put them in an exclusion group together. Names in the same group will not get each other as recipients.<br><br> Click "Add Group." Then,  you can drag and drop to move people around or select their name from the drop down in each box.`,

  `<span style="font-weight:bold">Step 3 / 4:</span> Click "Generate List!"`,
];

function secretSantaMode() {
  state.secretSanta = true;
  document.getElementById("left-container").classList.add("secret");
  stepOne();
}

export {stepOne}