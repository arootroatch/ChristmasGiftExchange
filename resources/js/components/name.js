import state, {updateState} from "../state";
import {addEventListener, pushHTMl, removeEventListener} from "../utils";
import {nameSelectContent} from "./house";

export function nameDiv(nameInput, nameNumber = state.nameNumber) {
    return `
    <div class="name-wrapper" id="wrapper-${nameInput}" draggable="true">
        <button id="delete-${nameInput}${nameNumber}" class="delete-name">X</button>
        <p class="name-entered" id="${nameInput}${nameNumber}">${nameInput}</p>
        <br id="br${nameInput}${nameNumber}">
    </div>`;
}

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
        const currentNameNumber = state.nameNumber;
        pushHTMl("participants", nameDiv(name, currentNameNumber));
        updateState({
            givers: [...state.givers, new Giver(name, "", "")],
            nameNumber: currentNameNumber + 1
        });
        refreshNameSelects();
        addEventListener(`delete-${name}${currentNameNumber}`, "click", deleteName);
        nameInput.value = "";
    }
}

function deleteName() {
    let nameWrapper = this.parentNode.id;
    let name = this.nextElementSibling.innerHTML;
    updateState({
        givers: state.givers.filter(giver => giver.name !== name)
    });
    removeEventListener(this.id, "click", deleteName);
    document.getElementById(nameWrapper).remove();
    refreshNameSelects();
}