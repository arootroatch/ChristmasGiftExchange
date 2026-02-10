import {state} from "../state.js";
import {addEventListener, fetchWithErrorHandling, selectElement, setLoadingState, unshiftHTML} from "../utils.js";
import {showError, showSuccess} from "./snackbar.js";
import {Events, stateEvents} from "../events.js";

const emailTableId = "emailTable";
const emailTableBodyId = "emailTableBody";
const hideEmailsId = "hideEmails";
const sendEmailsId = "sendEmails";
const submitEmailsId = "submitEmails";
const sendEmailsBtnId = "sendEmailsBtn";
const containerId = "email-table-container";

export function init() {
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isSecretSanta}) => {
    if (isSecretSanta) {
      render();
    }
  });
  stateEvents.on(Events.NEXT_STEP, ({step}) => {
    if (step === 4) {
      render();
    }
  });
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    const container = selectElement(`#${containerId}`);
    if (container) container.innerHTML = "";
  });
}

function template() {
  return `
    <div id="${emailTableId}" class="show">
      <h3>Please enter each participant's email address</h3>
      <form id="${emailTableBodyId}">
      ${state.givers.map((giver, i) => emailInput(giver, i)).join("")}
        <div id="emailBtnDiv">
          <button class="button" id="${hideEmailsId}" style="display: none;">Dismiss</button>
          <button type="submit" class="button" id="${submitEmailsId}">Submit Emails</button>
        </div>
      </form>
    </div>`;
}

export function emailInput(giver, i) {
  return `
    <div class="emailDiv">
      <label for=${i}>${giver.name}</label>
      <input type="email"
             class="emailInput"
             maxlength="100"
             placeholder="${giver.name}@example.com"
             name=${giver.name}
             id=${i}
             required/>
    </div>`;
}

function render() {
  const container = selectElement(`#${containerId}`);
  if (!container) return;
  container.innerHTML = template();
  if (!state.isSecretSanta) selectElement(`#${hideEmailsId}`).style.display = "block";
  addEventListener(`#${emailTableBodyId}`, "submit", submitEmails);
  addEventListener(`#${hideEmailsId}`, "click", hideEmailTable);
}

function hideEmailTable() {
  const table = selectElement(`#${emailTableId}`);
  selectElement(`#${hideEmailsId}`).style.display = "none";
  table.classList.replace("show", "hide");
  setTimeout(() => {
    table.classList.replace("hide", "hidden");
  }, 500);
}

async function submitEmails(event) {
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

function getEmails() {
  const emailInputs = Array.from(document.getElementsByClassName("emailInput"));
  return emailInputs.map((input) => {
    return {
      name: input.name,
      email: input.value.trim(),
      index: input.id
    };
  });
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

async function postToServer() {
  const options = {
    method: "POST",
    mode: "cors",
    body: JSON.stringify(state.givers),
  };
  return await fetchWithErrorHandling("/.netlify/functions/postToDb", options);
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

function dispatchEmailOptions(giver) {
  return {
    method: "POST",
    mode: "cors",
    body: JSON.stringify({
      name: giver.name,
      recipient: giver.recipient,
      email: giver.email,
    }),
  }
}

async function batchEmails() {
  setLoadingState(`#${sendEmailsBtnId}`);

  let count = 0;
  let promises = state.givers.map(async (giver) => {
    try {
      const response = await
        fetchWithErrorHandling("/.netlify/functions/dispatchEmail", dispatchEmailOptions(giver));
      if (response.status === 200) count++;
    } catch (error) {
      console.error(`Failed to send email to ${giver.email}:`, error);
    }
  });

  await Promise.all(promises);
  hideElement(sendEmailsId);
  showSuccess(`Sent ${count} of ${state.givers.length} emails successfully!`);
}
