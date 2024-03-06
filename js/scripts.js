import { generated } from "./generate.js";
import { secretSanta } from "./layout.js";

let givers = [];
let houseID = 0;
let nameNumber = 1;

document.getElementById("b0").addEventListener("click", addName);
document.getElementById("addHouse").addEventListener("click", addHouse);
document.getElementById("hideEmails").addEventListener("click", hideEmailTable);

// object constructor function
function Giver(name, recipient, email) {
  this.name = name;
  this.email = email;
  this.recipient = recipient;
  this.date = "";
  this.id = "";
}

function addName() {
  let nameInput = this.previousElementSibling.value;
  if (nameInput !== "") {
    let capitalized = nameInput.charAt(0).toUpperCase() + nameInput.slice(1);
    nameInput = capitalized;
    document.getElementById("participants").insertAdjacentHTML(
      "beforeend",
      `<div class="name-wrapper" id="wrapper-${nameInput}" draggable="true" ondragstart="drag(event)">
        <button id="delete-${nameInput}${nameNumber}" class="delete-name">X</button>
        <p class="name-entered" id="${nameInput}${nameNumber}">${nameInput}</p>
        <br id="br${nameInput}${nameNumber}">
      </div>`
    );
    givers.push(new Giver(nameInput, "", ""));
    if (houseID > 0) {
      let selects = Array.from(document.getElementsByClassName("name-select"));
      selects.map((select) => {
        select.innerHTML = `
        <option disabled selected value="option${houseID}">-- Select a name --</option>
        ${givers.map((x) => `<option value="${x.name}">${x.name}</option>`)}
        `;
      });
    }
  }
  document
  .getElementById(`delete-${nameInput}${nameNumber}`)
  .addEventListener("click", deleteName);
  document.getElementById("input0").value = "";
  nameNumber++;
}

function deleteName() {
  let nameWrapper = this.parentNode.id;
  let name = this.nextElementSibling.innerHTML;
  for (let i = 0; i < givers.length; i++) {
    if (givers[i].name === name) {
      givers.splice(i, 1);
    }
  }

  document.getElementById(nameWrapper).remove();
}

function addHouse() {
  let houseTemplate = `<div class="household" id="${houseID}">
      <h2 contenteditable="true">Group ${
        houseID + 1
      } <span class="edit-span">(Click here to rename)</span></h2>
      <div class="name-container" ondrop="drop(event)" ondragover="allowDrop(event)" ondragleave="dragLeave(event)"></div>
      <select class="name-select" name="${houseID}-select" id="${houseID}-select">
        <option disabled selected value="option${houseID}">-- Select a name --</option>
        ${givers.map((x) => `<option value="${x.name}">${x.name}</option>`)}
      </select>
      <button class="button deleteHouse" id="delete-${houseID}">Delete Group</button>
    </div>`;
  document
    .getElementById("left-container")
    .insertAdjacentHTML("beforeend", houseTemplate);
  document
    .getElementById(`delete-${houseID}`)
    .addEventListener("click", deleteHouse);
  document
    .getElementById(`${houseID}-select`)
    .addEventListener("change", insertName);
  houseID += 1;
}

// insert name into div from select and remove from participant list
function insertName() {
  let firstName = this.value;
  console.log(firstName);
  let nameDiv = document.getElementById(`wrapper-${firstName}`);
  if (this.parentNode.id === "name-list") {
    document.getElementById("participants").appendChild(nameDiv);
  } else {
    this.previousElementSibling.appendChild(nameDiv);
  }

  // set select back to saying "select a name"
  let label = this.firstElementChild.value;
  this.value = label;
}

function deleteHouse() {
  // find last household
  let houseDiv = this.parentNode;

  houseDiv.childNodes.forEach((x) => {
    // search inside last household for name container
    if (x.className === "name-container") {
      // grab name from each name wrapper div and put it back in the participants list
      Array.from(x.childNodes).forEach((y) => {
        document.getElementById("participants").appendChild(y);
      });
    }
  });
  // delete entire div from DOM
  houseDiv.remove();
}

// collect emails
function showEmailTable() {
  if (!generated) {
    showSnackbar(
      `Please click "Generate List" before entering emails.`,
      "error"
    );
  } else {
    const table = document.getElementById("emailTable");
    const body = document.getElementById("emailTableBody");
    // use a for loop instead of forEach to get access to the index -- this will be used later for adding the emails to the giver objects
    for (let i = 0; i < givers.length; i++) {
      body.insertAdjacentHTML(
        "afterbegin",
        `<div class="emailDiv">
          <label for=${i}>${givers[i].name}</label>
          <input type="email" class="emailInput" maxlength="100" placeholder="${givers[i].name}@example.com" name=${givers[i].name} id=${i} required/>
        </div>
        `
      );
    }
    table.classList.replace("hidden", "show");
    if (!secretSanta) {
      document.getElementById("hideEmails").style.display = "block";
    }
  }
}

function hideEmailTable() {
  const table = document.getElementById("emailTable");
  document.getElementById("hideEmails").style.display = "none";
  document.getElementById("confirmEmails").style.display = "none";
  table.classList.replace("show", "hide");
  setTimeout(() => {
    table.classList.replace("hide", "hidden");
  }, 500);
}

// snackbar
function showSnackbar(message, status) {
  const bar = document.getElementById("snackbar");
  if (status === "error") {
    bar.style.color = "#b31e20";
    bar.style.border = "3px solid #b31e20";
  } else if (status === "success") {
    bar.style.color = "#198c0a";
    bar.style.border = "2px solid #198c0a";
  }
  bar.innerHTML = message;
  bar.classList.replace("hidden", "show");
  setTimeout(() => {
    bar.classList.add("hide");
  }, 5000);
  // give the keyframes animation time to run before changing classes
  setTimeout(() => {
    bar.classList.replace("show", "hidden");
    bar.classList.remove("hide");
  }, 5500);
}

export { givers, showEmailTable, showSnackbar };
