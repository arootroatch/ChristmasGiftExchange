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

// Expose functions to global scope for inline HTML event handlers
if (typeof window !== 'undefined') {
  window.allowDrop = allowDrop;
  window.drag = drag;
  window.drop = drop;
  window.dragLeave = dragLeave;
}


