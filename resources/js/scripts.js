import state from "./state.js";
import {emailInput, houseTemplate, nameDiv, nameSelectContent} from "./htmlComponents";
import {addEventListener, pushHTMl, removeEventListener, unshiftHTMl} from "./utils";

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

addEventListener("b0", "click", addName);

export function refreshNameSelects() {
    let selects = Array.from(document.getElementsByClassName("name-select"));
    selects.map((select) => {
        select.innerHTML = nameSelectContent();
    });
}

export function addName() {
    const nameInput = this.previousElementSibling;
    let name = nameInput.value;
    if (name !== "") {
        name = name.charAt(0).toUpperCase() + name.slice(1);
        pushHTMl("participants", nameDiv(name));
        state.givers.push(new Giver(name, "", ""));
        refreshNameSelects();
        addEventListener(`delete-${name}${state.nameNumber}`, "click", deleteName);
        nameInput.value = "";
        state.nameNumber++;
    }
}

function deleteName() {
    let nameWrapper = this.parentNode.id;
    let name = this.nextElementSibling.innerHTML;
    state.givers = state.givers.filter(giver => giver.name !== name);
    removeEventListener(this.id, "click", deleteName);
    document.getElementById(nameWrapper).remove();
    refreshNameSelects();
}

addEventListener("addHouse", "click", addHouse);

export function addHouse() {
    pushHTMl("left-container", houseTemplate());
    addEventListener(`delete-${state.houseID}`, "click", deleteHouse);
    addEventListener(`select-${state.houseID}`, "change", insertNameFromSelect);
    state.houseID += 1;
}

addEventListener(`name-list-select`, "change", insertNameFromSelect);

export function insertNameFromSelect() {
    let firstName = this.value;
    let nameDiv = document.getElementById(`wrapper-${firstName}`);
    if (this.parentNode.id === "name-list") {
        document.getElementById("participants").appendChild(nameDiv);
    } else {
        this.previousElementSibling.appendChild(nameDiv);
    }
    this.value = "default";
}

export function deleteHouse() {
    let houseDiv = this.parentNode;

    houseDiv.childNodes.forEach((node) => {
        if (node.className === "name-container") {
            Array.from(node.childNodes).forEach((name) => {
                document.getElementById("participants").appendChild(name);
            });
        }
    });
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
        // use a for loop instead of forEach to get access to the index --
        // this will be used later for adding the emails to the giver objects
        for (let i = 0; i < state.givers.length; i++) {
            unshiftHTMl("emailTableBody", emailInput(i))
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
