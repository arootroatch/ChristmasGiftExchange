import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../../state.js";
import {addEventListener, pushHTML, selectElement, setLoadingState, apiFetch} from "../../../utils.js";
import {showError, showSuccess} from "../../../Snackbar.js";

const sendResultsId = "sendResults";
const sendResultsBtnId = "sendResultsBtn";
const confirmBtnId = "sendResultsConfirmBtn";
const cancelBtnId = "sendResultsCancelBtn";
const sendResultsNameId = "sendResultsName";
const sendResultsEmailId = "sendResultsEmail";
const sendResultsSubmitId = "sendResultsSubmit";

let cachedIsSecretSanta = false;
let cachedParticipants = [];
let cachedAssignments = [];

export function init() {
    stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isSecretSanta, participants, assignments}) => {
        cachedIsSecretSanta = isSecretSanta;
        cachedParticipants = participants;
        cachedAssignments = assignments;
        if (isSecretSanta) {
            render();
        }
    });
    stateEvents.on(Events.NEXT_STEP, ({step, isSecretSanta, participants, assignments}) => {
        cachedIsSecretSanta = isSecretSanta;
        cachedParticipants = participants;
        cachedAssignments = assignments;
        if (step === 4) {
            render();
        }
    });
    stateEvents.on(Events.EXCHANGE_STARTED, () => {
        remove();
    });
    stateEvents.on(Events.EMAILS_ADDED, () => {
        remove();
    });
}

const emailTableId = "emailTable";

function collapsedTemplate() {
    return `
    <div id="${sendResultsId}">
        <hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;"/>
        <p style="text-align:center;">Don't want to send out emails to everyone?</p>
        <div style="text-align:center;"><button class="button" id="${sendResultsBtnId}">Send Me the Results</button></div>
    </div>`;
}

function confirmationTemplate() {
    let html = `
    <div id="${sendResultsId}">
        <hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;"/>
        <p style="text-align:center;">Your exchange will not be saved. Recipients will not be able to look up wishlists or contact info. Be sure to save your results email or take a screenshot!</p>`;
    if (cachedIsSecretSanta) {
        html += `<p style="text-align:center;">This will reveal all gift exchange assignments on your screen.</p>`;
    }
    html += `
        <div style="text-align:center;">
            <button class="button" id="${confirmBtnId}">Continue</button>
            <button class="button" id="${cancelBtnId}">Cancel</button>
        </div>
    </div>`;
    return html;
}

function resultsTableHtml() {
    let html = '<div class="results-card"><h2>Results</h2><div class="results-header"><span>Giver</span><span></span><span>Recipient</span></div><div>';
    for (const a of cachedAssignments) {
        html += `<div class="result-row"><span>${a.giver}</span><span class="result-arrow">&#8594;</span><span>${a.recipient}</span></div>`;
    }
    html += '</div></div>';
    return html;
}

function formTemplate() {
    let html = `<div id="${sendResultsId}">
        <hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;"/>`;
    if (cachedIsSecretSanta) {
        html += resultsTableHtml();
    }
    html += `
        <div style="text-align:center; padding: 0 10px;">
        <label for="${sendResultsNameId}">Your name:</label>
        <select id="${sendResultsNameId}" required>
            <option disabled selected value="">-- Select your name --</option>
            ${cachedParticipants.map(p => `<option value="${p.name}">${p.name}</option>`).join("")}
        </select>
        <label for="${sendResultsEmailId}">Your email:</label>
        <input type="email" id="${sendResultsEmailId}" placeholder="your@email.com" required/>
        <button class="button" id="${sendResultsSubmitId}">Send</button>
        </div>
    </div>`;
    return html;
}

function render() {
    remove();
    pushHTML(`#${emailTableId}`, collapsedTemplate());
    addEventListener(`#${sendResultsBtnId}`, "click", showConfirmation);
}

function remove() {
    const el = selectElement(`#${sendResultsId}`);
    if (el) el.remove();
}

function showConfirmation() {
    remove();
    pushHTML(`#${emailTableId}`, confirmationTemplate());
    addEventListener(`#${confirmBtnId}`, "click", showForm);
    addEventListener(`#${cancelBtnId}`, "click", () => {
        remove();
        render();
    });
}

function showForm() {
    remove();
    pushHTML(`#${emailTableId}`, formTemplate());
    addEventListener(`#${sendResultsSubmitId}`, "click", submitResults);
}

async function submitResults() {
    const nameSelect = selectElement(`#${sendResultsNameId}`);
    const emailInput = selectElement(`#${sendResultsEmailId}`);
    const name = nameSelect.value;
    const email = emailInput.value.trim();

    if (!name || name === "") {
        showError("Please select your name");
        return;
    }
    if (!email) {
        showError("Please enter your email");
        return;
    }

    setLoadingState(`#${sendResultsSubmitId}`);

    await apiFetch("/.netlify/functions/api-results-email-post", {
        method: "POST",
        body: {name, email, assignments: cachedAssignments},
        onSuccess: () => {
            showSuccess("Results sent!");
            remove();
        },
        onError: (msg) => {
            showError(msg);
            const btn = selectElement(`#${sendResultsSubmitId}`);
            btn.textContent = "Send";
            btn.style.color = "";
        },
        fallbackMessage: "Failed to send results. Please try again.",
    });
}
