import {leftContainerId, participantsId, selectElement} from "../utils";
import { addNameToHouse, removeNameFromHouse } from "./state.js";
import houseStyles from '../../assets/styles/exchange/components/household.module.css';

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
  return target.closest(`.${houseStyles.nameContainer}`);
}

function createDropPreview() {
  const div = document.createElement('div');
  div.className = 'drop-preview';
  return div;
}

function addDropPreview(container, clientY) {
  const placeholder = container.querySelector('.house-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  const existing = container.querySelector('.drop-preview');
  const siblings = Array.from(container.querySelectorAll('.name-wrapper:not(.dragging-source)'));
  const nextSibling = siblings.find(el => {
    const rect = el.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2;
  });

  if (existing) {
    const currentNext = existing.nextElementSibling;
    if (currentNext === nextSibling || (!nextSibling && !currentNext)) return;
    existing.remove();
  }

  const preview = createDropPreview();
  if (nextSibling) {
    container.insertBefore(preview, nextSibling);
  } else {
    container.appendChild(preview);
  }
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
    addDropPreview(container, e.clientY);
  }
}

export function drag(e) {
  e.dataTransfer.setData("text", e.target.id);
}

function getSourceHouse(nameWrapper){
  const sourceContainer = nameWrapper.parentNode;
  const sourceHouse = sourceContainer.closest(`.${houseStyles.household}`);
  return sourceHouse?.id
}

function getDestHouse(container){
  const destHouse = container.closest(`.${houseStyles.household}`);
  const isDestMainList = (container.id === participantsId);
  return isDestMainList ? null : destHouse?.id;
}

export function drop(e) {
  const container = findContainer(e.target);
  if (container) {
    e.preventDefault();

    const preview = container.querySelector('.drop-preview');
    const insertBeforeId = preview?.nextElementSibling?.id;
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

    const droppedWrapper = document.getElementById(`wrapper-${name}`);
    if (droppedWrapper && insertBeforeId) {
      const refElement = document.getElementById(insertBeforeId);
      if (refElement && container.contains(refElement)) {
        container.insertBefore(droppedWrapper, refElement);
      }
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
      requestAnimationFrame(() => {
        e.target.classList.add('dragging-source');
        const sourceContainer = e.target.parentNode;
        if (sourceContainer?.classList.contains('name-container')) {
          const preview = createDropPreview();
          sourceContainer.insertBefore(preview, e.target.nextSibling);
        }
      });
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

  container.addEventListener('dragend', (e) => {
    stopAutoScroll();
    document.body.classList.remove('dragging');
    const source = container.querySelector('.dragging-source');
    if (source) source.classList.remove('dragging-source');
    container.querySelectorAll('.drop-preview').forEach(p => p.remove());
  });
}
