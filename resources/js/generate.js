import {showEmailTable} from "./components/emailTable"
import state, {assignRecipients, getHousesForGeneration} from "./state.js";
import * as self from "./generate.js";
import {showError} from "./components/snackbar";
import {selectElement} from "./utils";

const generateId = "generate";
const nextStepId = "nextStep";

export function initEventListeners() {
  const generateBtn = selectElement(`#${generateId}`);
  if (generateBtn) generateBtn.addEventListener("click", generateList);
}

export function hasDuplicates(arr) {
  let flattened = arr.flat();
  return new Set(flattened).size !== flattened.length;
}

export function generateList(_) {
  const {error, assignments} = self.generate();
  if (error) {
    showError(error);
    return;
  }

  assignRecipients(assignments);
  if (state.isSecretSanta) {
    showEmailTable();
    selectElement(`#${generateId}`).style.display = "none";
    selectElement(`#${nextStepId}`).style.display = "none";
  }
}

export function generate() {
  const error = checkForImpossible();
  if (error) return error;

  const assignment = buildRecipientAssignment();
  if (!assignment) {
    return {error: "No possible combinations! Please try a different configuration/number of names."};
  }

  return {assignments: assignment, error: null}
}

function checkForImpossible() {
  const housesArray = getHousesForGeneration();

  if (housesArray.length < 1) return {error: "Please enter participants' names."};

  if (hasDuplicates(housesArray))
    return {
      error: "Duplicate name detected! Please delete the duplicate and re-enter it with a last initial or nickname."
    };
}

function buildRecipientAssignment() {
  const houses = getHousesForGeneration();
  const giverNames = state.givers.map(giver => giver.name);

  if (giverNames.length === 0) return null;

  const nameToHouse = buildNameToHouseMap(houses);
  const recipientIndexByName = buildRecipientIndexMap(giverNames);
  const adjacency = buildAdjacency(giverNames, nameToHouse, recipientIndexByName);

  if (adjacency.some(list => list.length === 0)) return null;

  const matchToGiver = findPerfectMatching(adjacency, giverNames.length);
  if (!matchToGiver) return null;

  return buildAssignmentFromMatch(giverNames, matchToGiver);
}

function buildNameToHouseMap(houses) {
  const nameToHouse = new Map();
  houses.forEach((house, houseIndex) => {
    house.forEach(name => nameToHouse.set(name, houseIndex));
  });
  return nameToHouse;
}

function buildRecipientIndexMap(giverNames) {
  return new Map(giverNames.map((name, index) => [name, index]));
}

function buildAdjacency(giverNames, nameToHouse, recipientIndexByName) {
  return giverNames.map((giverName) => {
    const giverHouse = nameToHouse.get(giverName);
    const eligible = giverNames
      .filter(name => nameToHouse.get(name) !== giverHouse)
      .map(name => recipientIndexByName.get(name));
    shuffleInPlace(eligible);
    return eligible;
  });
}

function findPerfectMatching(adjacency, giverCount) {
  const matchToGiver = Array(giverCount).fill(null);

  function tryMatch(giverIndex, seen) {
    for (const recipientIndex of adjacency[giverIndex]) {
      if (seen[recipientIndex]) continue;
      seen[recipientIndex] = true;
      if (matchToGiver[recipientIndex] == null || tryMatch(matchToGiver[recipientIndex], seen)) {
        matchToGiver[recipientIndex] = giverIndex;
        return true;
      }
    }
    return false;
  }

  for (let giverIndex = 0; giverIndex < giverCount; giverIndex++) {
    const seen = Array(giverCount).fill(false);
    if (!tryMatch(giverIndex, seen)) return null;
  }

  return matchToGiver;
}

function buildAssignmentFromMatch(giverNames, matchToGiver) {
  const assignment = Array(giverNames.length);
  matchToGiver.forEach((giverIndex, recipientIndex) => {
    assignment[giverIndex] = giverNames[recipientIndex];
  });
  return assignment;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
