function allowDrop(e) {
  // prevent dropping inside another name div
  if (e.target.className === 'name-container'){
    e.preventDefault();
    e.target.style.backgroundColor = "#ffffff9e";
  }
}

function drag(e) {
  e.dataTransfer.setData("text", e.target.id);
}

function drop(e) {
  // prevent dropping inside another name
  if (e.target.className === 'name-container'){
    e.preventDefault();
    const data = e.dataTransfer.getData("text");
    e.target.appendChild(document.getElementById(data));
    e.target.style.backgroundColor="transparent";

  }
}

function dragLeave(e){
  e.target.style.backgroundColor="transparent";
}


