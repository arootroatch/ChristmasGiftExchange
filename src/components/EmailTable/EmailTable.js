import {ExchangeEvents as Events, exchangeEvents as stateEvents, addEmailsToParticipants, state} from "../../exchangeState.js";
import {addEventListener, pushHTML, selectElement, setLoadingState, escapeHTML} from "../../utils.js";
import {showError} from "../Snackbar.js";

const emailTableId = "emailTable";
const emailTableBodyId = "emailTableBody";
const hideEmailsId = "hideEmails";
const submitEmailsId = "submitEmails";

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
    const emailTable = selectElement(`#${emailTableId}`);
    if (emailTable) emailTable.remove();
  });
  stateEvents.on(Events.EMAILS_ADDED, () => {
    hideEmailTable();
  });
}

function template() {
  return `
    <div id="${emailTableId}" class="show">
      <h3>Please enter each participant's email address</h3>
      <form id="${emailTableBodyId}">
      ${state.participants.map((participant, i) => emailInput(participant, i)).join("")}
        <div id="emailBtnDiv">
          <button class="button" id="${hideEmailsId}" style="display: none;">Dismiss</button>
          <button type="submit" class="button" id="${submitEmailsId}">Submit Emails</button>
        </div>
      </form>
    </div>`;
}

export function emailInput(participant, i) {
  const safeName = escapeHTML(participant.name);
  return `
    <div class="emailDiv">
      <label for=${i}>${safeName}</label>
      <input type="email"
             class="emailInput"
             maxlength="100"
             placeholder="${safeName}@example.com"
             name=${safeName}
             id=${i}
             value="${escapeHTML(participant.email || "")}"
             required/>
    </div>`;
}

function render() {
  const existing = selectElement(`#${emailTableId}`);
  if (existing) existing.remove();
  pushHTML("body", template());
  if (!state.isSecretSanta) selectElement(`#${hideEmailsId}`).style.display = "block";
  addEventListener(`#${emailTableBodyId}`, "submit", submitEmails);
  addEventListener(`#${hideEmailsId}`, "click", hideEmailTable);
}

function hideEmailTable() {
  const table = selectElement(`#${emailTableId}`);
  if (!table) return;
  selectElement(`#${hideEmailsId}`).style.display = "none";
  table.classList.replace("show", "hide");
  setTimeout(() => {
    table.remove();
  }, 500);
}

async function submitEmails(event) {
  event.preventDefault();
  setLoadingState(`#${submitEmailsId}`);
  const emails = getEmails();

  try {
    const response = await postToServer();
    if (!response.ok) {
      handleEmailSubmitError(response);
    } else {
      const data = await response.json();
      state._tokenMap = data.participants;
      addEmailsToParticipants(emails);
    }
  } catch (error) {
    showError("Something went wrong");
  }
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

async function postToServer() {
  return fetch("/.netlify/functions/api-exchange-post", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      exchangeId: state.exchangeId,
      isSecretSanta: state.isSecretSanta,
      houses: state.houses,
      participants: state.participants,
      assignments: state.assignments
    })
  });
}

function handleEmailSubmitError() {
  showError("Failed to submit emails");
}
