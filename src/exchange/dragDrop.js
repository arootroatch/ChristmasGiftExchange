import {leftContainerId, participantsId, selectElement} from "../utils";
import { addNameToHouse, removeNameFromHouse } from "./state.js";

const SCROLL_ZONE = 80;
const SCROLL_SPEED = 20;
const CONTROL_STRIP_HEIGHT = 60;
let scrollAnimationId = null;

function autoScroll(clientY) {
  stopAutoScroll();

  const bottomEdge = window.innerHeight - CONTROL_STRIP_HEIGHT;

  if (clientY < SCROLL_ZONE) {
    const intensity = 1 - (clientY / SCROLL_ZONE);
    scrollAnimationId = requestAnimationFrame(function scrollUp() {
      window.scrollBy(0, -SCROLL_SPEED * intensity);
      scrollAnimationId = requestAnimationFrame(scrollUp);
    });
  } else if (clientY > bottomEdge - SCROLL_ZONE) {
    const intensity = 1 - ((bottomEdge - clientY) / SCROLL_ZONE);
    scrollAnimationId = requestAnimationFrame(function scrollDown() {
      window.scrollBy(0, SCROLL_SPEED * intensity);
      scrollAnimationId = requestAnimationFrame(scrollDown);
    });
  }
}

function stopAutoScroll() {
  cancelAnimationFrame(scrollAnimationId);
  scrollAnimationId = null;
}

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
    autoScroll(e.clientY);
    if (e.target.classList.contains('name-container')) {
      allowDrop(e);
    }
  });

  container.addEventListener('drop', (e) => {
    stopAutoScroll();
    if (e.target.classList.contains('name-container')) {
      drop(e);
    }
  });

  container.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('name-container')) {
      dragLeave(e);
    }
  });

  container.addEventListener('dragend', stopAutoScroll);
}



