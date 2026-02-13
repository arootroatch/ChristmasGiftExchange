import {addEmailsToGivers, state} from "../../state.js";
import {addEventListener, fetchWithErrorHandling, pushHTML, selectElement, setLoadingState} from "../../utils.js";
import {showError} from "../snackbar.js";
import {Events, stateEvents} from "../../events.js";

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
    table.classList.replace("hide", "hidden");
  }, 500);
}

async function submitEmails(event) {
  event.preventDefault();
  setLoadingState(`#${submitEmailsId}`);
  const emails = getEmails();

  try {
    const response = await postToServer();
    if (response.status !== 200) {
      handleEmailSubmitError(response);
    } else {
      addEmailsToGivers(emails);
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
  const options = {
    method: "POST",
    mode: "cors",
    body: JSON.stringify(state.givers),
  };
  return fetchWithErrorHandling("/.netlify/functions/postToDb", options);
}

function handleEmailSubmitError() {
  showError("Failed to submit emails");
}
