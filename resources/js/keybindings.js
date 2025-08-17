import state from "./state";

let isMobile;
isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
);

function enterClick(evt) {
  if (evt.keyCode === 13) {
    evt.preventDefault();
    document.getElementById("b0").click();
  }
}
function enterAddHouse(evt) {
  if (evt.shiftKey && evt.keyCode === 13) {
    evt.preventDefault();
    document.getElementById("addHouse").click();
  }
}
function enterGenerate(evt) {
  if (evt.ctrlKey && evt.keyCode === 13) {
    evt.preventDefault();
    if (!state.secretSanta) {
      document.getElementById("generate").click();
    } else {
      document.getElementById("secretGenerate").click();
    }
  }
}

document.getElementById("input0").addEventListener("keyup", enterClick);
if (isMobile === false) {
  window.addEventListener("keyup", enterAddHouse);
  window.addEventListener("keyup", enterGenerate);
}
