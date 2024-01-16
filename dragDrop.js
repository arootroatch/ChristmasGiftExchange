function allowDrop(ev) {
  // prevent dropping inside of another name div
  if (ev.target.className === 'name-container'){
    ev.preventDefault();
    ev.target.style.backgroundColor = "#ffffff35";
  }
}

function drag(ev) {
  ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
  // prevent droping inside of another name
  if (ev.target.className === 'name-container'){
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    ev.target.appendChild(document.getElementById(data));
    ev.target.style.backgroundColor="transparent";

  }
}

function dragLeave(ev){
  ev.target.style.backgroundColor="transparent";
}