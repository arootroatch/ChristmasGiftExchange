import {selectElement} from "./utils";

const leftContainerId = "left-container";

export function allowDrop(e) {
  if (e.target.className === 'name-container'){
    e.preventDefault();
    e.target.style.backgroundColor = "#ffffff9e";
  }
}

export function drag(e) {
  e.dataTransfer.setData("text", e.target.id);
}

export function drop(e) {
  if (e.target.className === 'name-container'){
    e.preventDefault();
    const data = e.dataTransfer.getData("text");
    e.target.appendChild(selectElement(`#${data}`));
    e.target.style.backgroundColor="transparent";

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



