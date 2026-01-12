import {setLoadingState, fetchWithErrorHandling} from "../utils";

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



document.getElementById("emailQueryBtn").addEventListener("click", getName);


async function getName(e) {
    e.preventDefault();
    const email = document.getElementById("emailQuery").value;
    const queryDiv = document.getElementById("query");
    setLoadingState("emailQueryBtn");

    const options = {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors",
        body: email, // GET requests can't have a body
    };

    try {
        const response = await fetchWithErrorHandling("/.netlify/functions/get_name", options);
        const results = await response.json();

        let timestamp = Date.parse(results.date);
        let date = new Date(timestamp);
        queryDiv.innerHTML = emailQueryResult(date, results.recipient);
        document.getElementById("emailQueryBtn").addEventListener("click", getName);
    } catch (error) {
        console.error('Error fetching name:', error);
        queryDiv.innerHTML = emailQueryError;
        setTimeout(() => {
            queryDiv.innerHTML = emailQueryInit;
        }, 2000);
    }
}