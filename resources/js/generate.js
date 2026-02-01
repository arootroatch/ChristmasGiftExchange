import {showEmailTable} from "./components/emailTable"
import state, { getHousesForGeneration } from "./state.js";
import * as self from "./generate.js";
import {showError} from "./components/snackbar";
import {selectElement} from "./utils";

const generateId = "generate";
const tableBodyId = "table-body";
const nextStepId = "nextStep";
const nameListId = "name-list";

export function initEventListeners() {
  const generateBtn = selectElement(`#${generateId}`);
  if (generateBtn) generateBtn.addEventListener("click", generateList);
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

function displayEmptyTable() {
  let parentNode = selectElement(`#${tableBodyId}`);
  parentNode?.insertAdjacentHTML("beforeend", emptyTable());
}

export function clearGeneratedListTable() {
  let parentNode = selectElement(`#${tableBodyId}`);
  while (parentNode?.firstChild) {
    parentNode.removeChild(parentNode.firstChild);
  }
}

export function hasDuplicates(arr) {
  let flattened = arr.flat();
  return new Set(flattened).size !== flattened.length;
}

export function fillHouses() {
  state.houses = getHouses().concat(getIndividualParticipantNames());
}

function getHouses() {
  const houseElements = document.getElementsByClassName("household");
  const houseElementsArray = [...houseElements];
  return houseElementsArray.map(getHouse).filter((house) => house.length > 0);
}

function getHouse(house) {
  let names = [];
  house.childNodes.forEach((x) => {
    if (isNameContainer(x)) {
      x.childNodes.forEach((y) => {
        if (isNameWrapper(y)) {
          names.push(y.id.slice(8));
        }
      });
    }
  });
  return names;
}

function getIndividualParticipantNames() {
  let names = [];
  const nameList = selectElement(`#${nameListId}`)?.childNodes;
  if (nameList) {
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

export function generateList(maxAttempts = 25) {
  let counter = 0;
  const {error, results} = self.generate(counter, maxAttempts);
  if (error) {
    showError(error);
    return;
  }
  if (state.isSecretSanta) {
    showEmailTable();
    selectElement(`#${generateId}`).style.display = "none";
    selectElement(`#${nextStepId}`).style.display = "none";
  } else {
    renderResultsToTable(results);
  }
}

export function generate(counter, maxAttempts) {
  const error = checkForImpossible(counter, maxAttempts);
  if (error) return error;
  attemptToDrawNames();

  if (state.isGenerated) {
    return {results: state.givers, error: null}
  } else {
    return self.generate(counter + 1, maxAttempts);
  }
}

function attemptToDrawNames() {
  let availableRecipients = deepCopy(getHousesForGeneration());

  for (const giver of state.givers) {
    const {randomHouseIndex, randomHouse} = selectValidHouse(availableRecipients, giver);

    if (randomHouseIndex == null || randomHouse == null) {
      state.isGenerated = false;
      break;
    }

    const {recipient, randomRecipientIndex} = selectRecipient(randomHouse);
    giver.recipient = recipient;
    removeName(availableRecipients, randomHouseIndex, randomRecipientIndex);
    maybeRemoveHouse(availableRecipients, randomHouseIndex);
    state.isGenerated = true;
  }
}

export function selectValidHouse(availableRecipients, giver) {
  let randomHouseIndex = Math.floor(availableRecipients.length * Math.random());
  let randomHouse = availableRecipients[randomHouseIndex];

  if (isNotGiversHouse(randomHouse, giver)) {
    return {randomHouseIndex: randomHouseIndex, randomHouse: randomHouse}
  } else {
    if (availableRecipients.length > 1) {
      const prevIndex = randomHouseIndex;
      while (randomHouseIndex === prevIndex) {
        randomHouseIndex = Math.floor(availableRecipients * Math.random());
        randomHouse = availableRecipients[randomHouseIndex];
      }
      return {randomHouseIndex: randomHouseIndex, randomHouse: randomHouse};
    } else {
      return {randomHouseIndex: null, randomHouse: null}
    }
  }
}

function selectRecipient(house) {
  const randomRecipientIndex = Math.floor(house.length * Math.random());
  return {
    recipient: house[randomRecipientIndex],
    randomRecipientIndex: randomRecipientIndex
  }
}

function removeName(availableRecipients, houseIndex, recipientIndex) {
  availableRecipients[houseIndex].splice(recipientIndex, 1);
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
  selectElement(`#${tableBodyId}`).insertAdjacentHTML(
    "beforeend",
    html
  );
}

function isNameContainer(element) {
  return element.className === "name-container";
}

function isNameWrapper(element) {
  return element.id?.includes("wrapper");
}

function isNotGiversHouse(house, giver) {
  const allHouses = getHousesForGeneration();
  const originalHouse = allHouses.find((h) => h.includes(house[0]));
  return !originalHouse.includes(giver.name)
}

function maybeRemoveHouse(availableRecipients, index) {
  if (availableRecipients[index].length === 0) {
    availableRecipients.splice(index, 1);
  }
}

function checkForImpossible(counter, maxAttempts) {
  const housesArray = getHousesForGeneration();

  if (housesArray.length < 1) return {error: "Please enter participants' names."};

  if (hasDuplicates(housesArray))
    return {
      error: "Duplicate name detected! Please delete the duplicate and re-enter it with a last initial or nickname."
    };

  if (counter >= maxAttempts)
    return {error: "No possible combinations! Please try a different configuration/number of names."};
}