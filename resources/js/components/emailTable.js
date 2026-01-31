import state from "../state";
import {addEventListener, setLoadingState, unshiftHTMl, fetchWithErrorHandling, selectElement} from "../utils";
import {showError, showSuccess} from "./snackbar";

const emailTableId = "emailTable";
const emailTableBodyId = "emailTableBody";
const hideEmailsId = "hideEmails";
const sendEmailsId = "sendEmails";
const submitEmailsId = "submitEmails";
const sendEmailsBtnId = "sendEmailsBtn";

export function emailInput(i) {
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


// collect emails
export function showEmailTable() {
    if (!state.isGenerated) {
        showError(`Please click "Generate List" before entering emails.`);
    } else {
        const table = selectElement(`#${emailTableId}`);
        // use a for loop instead of forEach to get access to the index --
        // this will be used later for adding the emails to the giver objects
        for (let i = 0; i < state.givers.length; i++) {
            unshiftHTMl(`#${emailTableBodyId}`, emailInput(i))
        }
        table.classList.replace("hidden", "show");
        if (!state.isSecretSanta) {
            selectElement(`#${hideEmailsId}`).style.display = "block";
        }
    }
}

function hideEmailTable() {
    const table = selectElement(`#${emailTableId}`);
    selectElement(`#${hideEmailsId}`).style.display = "none";
    table.classList.replace("show", "hide");
    setTimeout(() => {
        table.classList.replace("hide", "hidden");
    }, 500);
}


export function hideElement(thing) {
    const table = selectElement(`#${thing}`);
    table.classList.add("hide");
    setTimeout(() => {
        table.classList.replace("show", "hidden");
        table.classList.remove("hide");
    }, 500);
}

export function handleEmailSubmitError(response) {
    console.log(response.body);
}

function updateStateWithEmails(emails) {
    let random = Math.random().toString(20);
    let date = new Date().toISOString();
    emails.forEach((obj) => {
        let i = parseInt(obj.index);
        state.givers[i].email = obj.email;
        state.givers[i].id = `${state.givers.length}_${random}_${date}`;
        state.givers[i].date = date;
    });
}

export async function submitEmails(event) {
    event.preventDefault();
    setLoadingState(`#${submitEmailsId}`);
    const emails = getEmails();
    updateStateWithEmails(emails);

    try {
        const response = await postToServer();
        if (response.status === 200) {
            displaySendEmails();
            hideElement(emailTableId);
        } else {
            handleEmailSubmitError(response);
        }
    } catch (error) {
        console.error('Error submitting emails:', error);
        showError('Failed to submit emails. Please try again.');
    }

    return false;
}

async function batchEmails() {
    setLoadingState(`#${sendEmailsBtnId}`);

    let i = 0;
    let count = 0;
    let promises = state.givers.map(async (giver) => {
        i++;
        try {
            const response = await fetchWithErrorHandling("/.netlify/functions/dispatchEmail", {
                method: "POST",
                mode: "cors",
                body: JSON.stringify({
                    name: giver.name,
                    recipient: giver.recipient,
                    email: giver.email,
                }),
            });
            if (response.status === 200) {
                count++;
            }
        } catch (error) {
            console.error(`Failed to send email to ${giver.email}:`, error);
        }
    });

    await Promise.all(promises);
    hideElement(sendEmailsId);
    showSuccess(`Sent ${count} of ${state.givers.length} emails successfully!`);
}

export function displaySendEmails() {
    const sendDiv = selectElement(`#${sendEmailsId}`);
    sendDiv.innerHTML = `
          <p>${state.givers.length} email addresses added successfully!</p>
          <p>Now let's send out those emails:</p>
          <button class="button" id="${sendEmailsBtnId}">Send Emails</button>
        `;
    sendDiv.classList.replace("hidden", "show");
    addEventListener(`#${sendEmailsBtnId}`, "click", batchEmails);
}

export function getEmails() {
    const emailInputs = Array.from(document.getElementsByClassName("emailInput"));
    return emailInputs.map((input) => {
        return {
            name: input.name,
            email: input.value.trim(),
            index: input.id
        };
    });
}

export async function postToServer() {
    const options = {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors",
        body: JSON.stringify(state.givers), // GET requests can't have a body
    };
    return await fetchWithErrorHandling("/.netlify/functions/postToDb", options);
}

export function initEventListeners() {
    addEventListener(`#${emailTableBodyId}`, "submit", submitEmails);
    addEventListener(`#${hideEmailsId}`, "click", hideEmailTable);
}