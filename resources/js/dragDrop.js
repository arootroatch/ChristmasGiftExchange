export function allowDrop(e) {
  // prevent dropping inside another name div
  if (e.target.className === 'name-container'){
    e.preventDefault();
    e.target.style.backgroundColor = "#ffffff9e";
  }
}

export function drag(e) {
  e.dataTransfer.setData("text", e.target.id);
}

export function drop(e) {
  // prevent dropping inside another name
  if (e.target.className === 'name-container'){
    e.preventDefault();
    const data = e.dataTransfer.getData("text");
    e.target.appendChild(document.getElementById(data));
    e.target.style.backgroundColor="transparent";

  }
}

export function dragLeave(e){
  e.target.style.backgroundColor="transparent";
}

// Initialize drag-and-drop with event delegation
export function initDragDrop() {
  // Use event delegation on the container to handle all drag events
  const container = document.getElementById('left-container');
  if (!container) return;

  // Handle dragstart on name-wrappers
  container.addEventListener('dragstart', (e) => {
    if (e.target.classList.contains('name-wrapper')) {
      drag(e);
    }
  });

  // Handle dragover on name-containers
  container.addEventListener('dragover', (e) => {
    if (e.target.classList.contains('name-container')) {
      allowDrop(e);
    }
  });

  // Handle drop on name-containers
  container.addEventListener('drop', (e) => {
    if (e.target.classList.contains('name-container')) {
      drop(e);
    }
  });

  // Handle dragleave on name-containers
  container.addEventListener('dragleave', (e) => {
    if (e.target.classList.contains('name-container')) {
      dragLeave(e);
    }
  });
}

// Auto-initialize in browser environment (not during tests)
if (typeof document !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDragDrop);
  } else {
    initDragDrop();
  }
}


