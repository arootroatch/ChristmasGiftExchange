import showSnackbar from "./components/snackbar"
import {showEmailTable} from "./components/emailTable"
import state from "./state.js";

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

function getHouses() {
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

export function deepCopy(arr) {
  let copy = [];
  arr.forEach(() => {
    copy.push([]);
  });
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr[i].length; j++) {
      copy[i].push(arr[i][j]);
    }
  }
  return copy;
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
  return randomHouse;
}

function removeName(availableRecipients, houseIndex, recipientIndex) {
  availableRecipients[houseIndex].splice(recipientIndex, 1);
}

function maybeRemoveHouse(availableRecipients, index) {
  if (availableRecipients[index].length === 0) {
    availableRecipients.splice(index, 1);
  }
}

function checkForImpossible(counter, maxAttempts) {
  if (state.houses.length < 1) return {error: "Please enter participants' names."};

  if (hasDuplicates(state.houses))
    return {
      error: "Duplicate name detected! Please delete the duplicate and re-enter it with a last initial or nickname."
    };

  if (counter >= maxAttempts)
    return {error: "No possible combinations! Please try a different configuration/number of names."};
}

function selectRecipient(availableRecipients, randomHouseIndex) {
  const randomRecipientIndex = Math.floor(availableRecipients[randomHouseIndex].length * Math.random());
  return {
    recipient: availableRecipients[randomHouseIndex][randomRecipientIndex],
    randomRecipientIndex: randomRecipientIndex
  }
}

function attemptToDrawNames(counter) {
  let availableRecipients = deepCopy(state.houses);

  for (const giver of state.givers) {
    const randomHouseIndex = selectValidHouse(availableRecipients.length, giver);

    if (randomHouseIndex === undefined) {
      state.isGenerated = false;
      counter++;
      break;
    }

    const {recipient, randomRecipientIndex} = selectRecipient(availableRecipients, randomHouseIndex);
    giver.recipient = recipient;
    removeName(availableRecipients, randomHouseIndex, randomRecipientIndex);
    maybeRemoveHouse(availableRecipients, randomHouseIndex);
    state.isGenerated = true;
  }
}

function generate(counter, maxAttempts) {
  const error = checkForImpossible(counter, maxAttempts);
  if (error) return error;
  attemptToDrawNames(counter);

  if (state.isGenerated) {
    return {results: state.givers, error: null}
  } else {
    return generate(counter, maxAttempts);
  }
}

function renderResultsToTable(results) {
  clearGeneratedListTable();

  let html = '';
  for (const giver of results) {
    html += `<tr>
                <td>${giver.name}</td>
                <td>${giver.recipient}</td>
            </tr>`;
  }
  document.getElementById("table-body").insertAdjacentHTML(
    "beforeend",
    html
  );
}

export function generateList(maxAttempts = 25) {
  fillHouses();
  let counter = 0;
  const {error, results} = generate(counter, maxAttempts);
  (error && showSnackbar(error, "error"));
  renderResultsToTable(results);
}

export function secretSantaStart(maxAttempts = 25) {
  fillHouses();
  let counter = 0;
  const {error} = generate(counter, maxAttempts);
  (error && showSnackbar(error, "error"));
  showEmailTable();
  document.getElementById("secretGenerate").style.display = "none";
  document.getElementById("nextStep").style.display = "none";
}

