import showSnackbar from "./components/snackbar"
import {showEmailTable} from "./components/emailTable"
import state from "./state.js";
import {pushHTMl} from "./utils";

// Event listeners only in browser environment
if (typeof document !== 'undefined') {
  const generateBtn = document.getElementById("generate");
  const secretGenerateBtn = document.getElementById("secretGenerate");

  if (generateBtn) {
    generateBtn.addEventListener("click", generateList);
  }
  if (secretGenerateBtn) {
    secretGenerateBtn.addEventListener("click", secretSantaStart);
  }
}

export function clearGeneratedListTable() {
  let parentNode = document.getElementById("table-body");
  while (parentNode.firstChild) {
    parentNode.removeChild(parentNode.firstChild);
  }
}

export function emptyTable() {
  return `
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td></td>
      <td></td>
    </tr>`
}

function isNameContainer(element) {
  return element.className === "name-container";
}

function isNameWrapper(element) {
  return element.id.includes("wrapper");
}

function getHouse(house) {
  let tempArr = [];
  house.childNodes.forEach((x) => {
    if (isNameContainer(x)) {
      x.childNodes.forEach((y) => {
        if (isNameWrapper(y)) {
          tempArr.push(y.id.slice(8));
        }
      });
    }
  });
  return tempArr;
}

function getHouses(){
  const houseElements = document.getElementsByClassName("household");
  const houseElementsArray = [...houseElements];
  return houseElementsArray.map(getHouse).filter((house) => house.length > 0);
}

function getIndividualParticipantNames() {
  let names = [];
  const nameList = document.getElementById("name-list").childNodes;
  const nameListArray = [...nameList];
  nameListArray.forEach((x) => {
    if (isNameContainer(x)) {
      x.childNodes.forEach((y) => {
        if (isNameWrapper(y)) {
          // add them to their own array so they can be matched with anybody
          names.push([y.id.slice(8)]);
        }
      });
    }
  });
  return names;
}

export function fillHouses() {
  state.houses = getHouses().concat(getIndividualParticipantNames());
}

export function populateAvailRecipients(arr) {
  state.availRecipients = [];
  arr.forEach(() => {
    state.availRecipients.push([]);
  });
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr[i].length; j++) {
      state.availRecipients[i].push(arr[i][j]);
    }
  }
}

export function hasDuplicates(arr) {
  let flattened = arr.flat();
  return new Set(flattened).size !== flattened.length;
}

function selectValidHouse(numberOfHouses, giver) {
  let randomHouse = Math.floor(numberOfHouses * Math.random());
  if (state.houses[randomHouse].includes(giver.name)) {
    if (numberOfHouses > 1) {
      let prevRandomHouse = randomHouse;
      while (randomHouse === prevRandomHouse) {
        randomHouse = Math.floor(numberOfHouses * Math.random());
      }
      return randomHouse;
    }
  }
}

function generate(counter, maxAttempts) {
  let recipient;
  let randomRecipientIndex;
  let randomHouseIndex;
  let broken = false;
  fillHouses();
  populateAvailRecipients(state.houses);
  let numberOfHouses = state.houses.length;
  if (state.houses.length < 1) {
    showSnackbar("Please enter participants' names.", "error");
    return;
  }

  if (hasDuplicates(state.houses)) {
    showSnackbar(
      "Duplicate name detected! Please delete the duplicate and re-enter it with a last initial or nickname.",
      "error"
    );
    return;
  }

  if (counter >= maxAttempts) {
    clearGeneratedListTable();
    pushHTMl("table-body", emptyTable());
    showSnackbar(
      "No possible combinations! Please try a different configuration/number of names.",
      "error"
    );
    return;
  }

  clearGeneratedListTable();
  for (const giver of state.givers) {
    randomHouseIndex = selectValidHouse(numberOfHouses, giver);

    if (!randomHouseIndex) {
      broken = true;
      counter++;
      break;
    }

    randomRecipientIndex = Math.floor(state.availRecipients[randomHouseIndex].length * Math.random());
    recipient = state.availRecipients[randomHouseIndex][randomRecipientIndex];
    giver.recipient = recipient;

    state.availRecipients[randomHouseIndex].splice(randomRecipientIndex, 1); //remove name from possible options

    if (state.availRecipients[randomHouseIndex].length === 0) {
      state.availRecipients.splice(randomHouseIndex, 1); //check if that leaves an empty array and remove if so
      numberOfHouses - 1 > -1 ? numberOfHouses-- : (numberOfHouses = 0); //decrement number of houses to prevent undefined when randomly selecting next array. don't let it fall under zero
    }

    state.generated = true;
    if (!state.secretSanta) {
      document.getElementById("table-body").insertAdjacentHTML(
        "beforeend",
        `<tr>
                <td>${giver.name}</td>
                <td>${giver.recipient}</td>
            </tr>`
      );
    }
  }

  if (broken === true) {
    state.generated = false;
    generate(counter, maxAttempts);
  }


}

export function generateList(maxAttempts = 25) {
  let counter = 0;
  generate(counter, maxAttempts);

}

export function secretSantaStart() {
  generateList();
  showEmailTable();
  document.getElementById("secretGenerate").style.display = "none";
  document.getElementById("nextStep").style.display = "none";
}

