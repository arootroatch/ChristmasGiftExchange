import state from "./state.js";
import {nameDiv, nameSelectContent} from "./htmlComponents";
import {pushHTMl, addEventListener, removeEventListener} from "./utils";

addEventListener("b0", "click", addName);
addEventListener("addHouse", "click", addHouse);
addEventListener("hideEmails", "click", hideEmailTable);

export class Giver {
    constructor(name, recipient, email) {
        this.name = name;
        this.email = email;
        this.recipient = recipient;
        this.date = "";
        this.id = "";
    }
}

function maybeRefreshNameSelects() {
    if (state.houseID > 0) {
        let selects = Array.from(document.getElementsByClassName("name-select"));
        selects.map((select) => {
            select.innerHTML = nameSelectContent();
        });
    }
}

function addName() {
    const nameInput = this.previousElementSibling;
    let name = nameInput.value;
    if (name !== "") {
        name = name.charAt(0).toUpperCase() + name.slice(1);
        pushHTMl("participants", nameDiv(name));
        state.givers.push(new Giver(name, "", ""));
        maybeRefreshNameSelects();
        addEventListener(`delete-${name}${state.nameNumber}`, "click", deleteName);
        nameInput.value = "";
        state.nameNumber++;
    }
}

function deleteName() {
    let nameWrapper = this.parentNode.id;
    let name = this.nextElementSibling.innerHTML;
    state.givers = state.givers.filter(giver => giver.name !== name);
    document.getElementById(nameWrapper).remove();
    removeEventListener(this.id, "click", deleteName);
}

export function addHouse() {
    let houseTemplate = `<div class="household" id="${state.houseID}">
      <h2 contenteditable="true">Group ${
        state.houseID + 1
    } <span class="edit-span">(Click here to rename)</span></h2>
      <div class="name-container" ondrop="drop(event)" ondragover="allowDrop(event)" ondragleave="dragLeave(event)"></div>
      <select class="name-select" name="${state.houseID}-select" id="${state.houseID}-select">
        <option disabled selected value="option${state.houseID}">-- Select a name --</option>
        ${state.givers.map((x) => `<option value="${x.name}">${x.name}</option>`)}
      </select>
      <button class="button deleteHouse" id="delete-${state.houseID}">Delete Group</button>
    </div>`;
    pushHTMl("left-container", houseTemplate);
    addEventListener(`delete-${state.houseID}`, "click", deleteHouse);
    addEventListener(`${state.houseID}-select`, "change", insertName);
    state.houseID += 1;
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
    this.value = this.firstElementChild.value;
}

function deleteHouse() {
    // find last household
    let houseDiv = this.parentNode;

    houseDiv.childNodes.forEach((node) => {
        // search inside last household for name container
        if (node.className === "name-container") {
            // grab name from each name wrapper div and put it back in the participants list
            Array.from(node.childNodes).forEach((name) => {
                document.getElementById("participants").appendChild(name);
            });
        }
    });
    // delete entire div from DOM
    houseDiv.remove();
}

// collect emails
function showEmailTable() {
    if (!state.generated) {
        showSnackbar(
            `Please click "Generate List" before entering emails.`,
            "error"
        );
    } else {
        const table = document.getElementById("emailTable");
        const body = document.getElementById("emailTableBody");
        // use a for loop instead of forEach to get access to the index -- this will be used later for adding the emails to the giver objects
        for (let i = 0; i < state.givers.length; i++) {
            body.insertAdjacentHTML(
                "afterbegin",
                `<div class="emailDiv">
          <label for=${i}>${state.givers[i].name}</label>
          <input type="email" class="emailInput" maxlength="100" placeholder="${state.givers[i].name}@example.com" name=${state.givers[i].name} id=${i} required/>
        </div>
        `
            );
        }
        table.classList.replace("hidden", "show");
        if (!state.secretSanta) {
            document.getElementById("hideEmails").style.display = "block";
        }
    }
}

function hideEmailTable() {
    const table = document.getElementById("emailTable");
    document.getElementById("hideEmails").style.display = "none";
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

export {showEmailTable, showSnackbar};
