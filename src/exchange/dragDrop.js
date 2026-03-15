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

function findContainer(target) {
  return target.closest('.name-container');
}

function addDropPreview(container) {
  if (container.querySelector('.drop-preview')) return;
  const placeholder = container.querySelector('.house-placeholder');
  if (placeholder) placeholder.style.display = 'none';
  container.insertAdjacentHTML('beforeend', '<div class="drop-preview"></div>');
}

function removeDropPreview(container) {
  const preview = container.querySelector('.drop-preview');
  if (preview) preview.remove();
  const placeholder = container.querySelector('.house-placeholder');
  if (placeholder) placeholder.style.display = '';
}

export function allowDrop(e) {
  const container = findContainer(e.target);
  if (container) {
    e.preventDefault();
    addDropPreview(container);
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

function getDestHouse(container){
  const destHouse = container.closest('.household');
  const isDestMainList = (container.id === participantsId);
  return isDestMainList ? null : destHouse?.id;
}

export function drop(e) {
  const container = findContainer(e.target);
  if (container) {
    e.preventDefault();
    removeDropPreview(container);

    const data = e.dataTransfer.getData("text");
    const nameWrapper = selectElement(`#${data}`);
    const name = data.replace("wrapper-", "");
    const sourceHouseID = getSourceHouse(nameWrapper);
    const destHouseID = getDestHouse(container);

    if (sourceHouseID) {
      removeNameFromHouse(sourceHouseID, name);
    }
    if (destHouseID) {
      addNameToHouse(destHouseID, name);
    }

    container.style.backgroundColor = "transparent";
  }
}

export function dragLeave(e) {
  const container = findContainer(e.target);
  if (container && !container.contains(e.relatedTarget)) {
    removeDropPreview(container);
  }
}

export function initDragDrop() {
  const container = selectElement(`#${leftContainerId}`);
  if (!container) return;

  container.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('name-wrapper')) {
      document.body.classList.add('dragging');
      drag(e);
    }
  });

  container.addEventListener('dragover', (e) => {
    autoScroll(e.clientY);
    allowDrop(e);
  });

  container.addEventListener('drop', (e) => {
    stopAutoScroll();
    drop(e);
  });

  container.addEventListener('dragleave', (e) => {
    dragLeave(e);
  });

  container.addEventListener('dragend', () => {
    stopAutoScroll();
    document.body.classList.remove('dragging');
  });
}
