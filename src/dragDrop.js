import {leftContainerId, participantsId, selectElement} from "./utils";
import { addNameToHouse, removeNameFromHouse } from "./state.js";

export function allowDrop(e) {
  if (e.target.className === 'name-container'){
    e.preventDefault();
    e.target.style.backgroundColor = "#ffffff9e";
  }
}

export function drag(e) {
  e.dataTransfer.setData("text", e.target.id);
}

function getSourceHouse(nameWrapper){
  const sourceContainer = nameWrapper.parentNode;
  const sourceHouse = sourceContainer.closest('.household');
  return sourceHouse?.id
}

function getDestHouse(e){
  const destContainer = e.target;
  const destHouse = destContainer.closest('.household');
  const isDestMainList = (destContainer.id === participantsId);
  return isDestMainList ? null : destHouse?.id;
}

export function drop(e) {
  if (e.target.className === 'name-container'){
    e.preventDefault();

    const data = e.dataTransfer.getData("text");
    const nameWrapper = selectElement(`#${data}`);
    const name = data.replace("wrapper-", "");
    const sourceHouseID = getSourceHouse(nameWrapper);
    const destHouseID = getDestHouse(e);

    // Only update state - events trigger DOM updates
    if (sourceHouseID) {
      removeNameFromHouse(sourceHouseID, name);
    }
    if (destHouseID) {
      addNameToHouse(destHouseID, name);
    }

    e.target.style.backgroundColor = "transparent";
  }
}

export function dragLeave(e){
  e.target.style.backgroundColor="transparent";
}

export function initDragDrop() {
  const container = selectElement(`#${leftContainerId}`);
  if (!container) return;

  container.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('name-wrapper')) {
      drag(e);
    }
  });

  container.addEventListener('dragover', (e) => {
    if (e.target.classList.contains('name-container')) {
      allowDrop(e);
    }
  });

  container.addEventListener('drop', (e) => {
    if (e.target.classList.contains('name-container')) {
      drop(e);
    }
  });

  container.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('name-container')) {
      dragLeave(e);
    }
  });
}



