// REGION - EMAIL LOOKUP

import state from "./state";

export const emailQueryInput =
    `<div>
        <input
            type="email"
            maxlength="100"
            id="emailQuery"
            placeholder="Enter your email to search"
        />
        <button
            type="submit"
            class="button queryBtn"
            id="emailQueryBtn"
        >
        Search it!
        </button>
    </div>`

export const emailQueryInit =
    `<label for="emailQuery">
        Need to know who you're buying a gift for?
    </label>
    ${emailQueryInput}`

export const emailQueryError =
    `<div style="color:#b31e20">
        Email address not found!
    </div>`

export function emailQueryResult(date, recipient) {
    return `
    <div>
        As of ${date.toDateString()}, you're buying a gift for <span>${recipient}!</span>
    </div>
    ${emailQueryInput}`;
}

// END REGION - EMAIL LOOKUP

export function nameDiv(nameInput) {
    return `
    <div class="name-wrapper" id="wrapper-${nameInput}" draggable="true" ondragstart="drag(event)">
        <button id="delete-${nameInput}${state.nameNumber}" class="delete-name">X</button>
        <p class="name-entered" id="${nameInput}${state.nameNumber}">${nameInput}</p>
        <br id="br${nameInput}${state.nameNumber}">
    </div>`;
}

export function nameSelectContent() {
    return `
    <option disabled selected value="option${state.houseID}">-- Select a name --</option>
    ${state.givers.map((giver) => `<option value="${giver.name}">${giver.name}</option>`)}
    `;
}
