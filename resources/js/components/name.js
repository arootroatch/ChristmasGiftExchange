import state from "../state";
import {addEventListener, pushHTMl, removeEventListener} from "../utils";
import {nameSelectContent} from "./house";

export function nameDiv(nameInput) {
    return `
    <div class="name-wrapper" id="wrapper-${nameInput}" draggable="true">
        <button id="delete-${nameInput}${state.nameNumber}" class="delete-name">X</button>
        <p class="name-entered" id="${nameInput}${state.nameNumber}">${nameInput}</p>
        <br id="br${nameInput}${state.nameNumber}">
    </div>`;
}

export class Giver {
    constructor(name, recipient = "", email = "") {
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
        state.givers.push(new Giver(name));
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