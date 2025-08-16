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


export function emailInput(i){
    return `
    <div class="emailDiv">
      <label for=${i}>${state.givers[i].name}</label>
      <input type="email" 
             class="emailInput" 
             maxlength="100" 
             placeholder="${state.givers[i].name}@example.com" 
             name=${state.givers[i].name}
             id=${i} 
             required/>
    </div>`;
}
