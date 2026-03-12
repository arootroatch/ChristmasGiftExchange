import {ExchangeEvents as Events, exchangeEvents as stateEvents, addEmailsToParticipants, getExchangePayload} from "../../state.js";
import {addEventListener, pushHTML, selectElement, setLoadingState, escapeAttr, apiFetch, serverErrorMessage} from "../../../utils.js";
import {showError} from "../../../Snackbar.js";

const emailTableId = "emailTable";
const emailTableBodyId = "emailTableBody";
const hideEmailsId = "hideEmails";
const submitEmailsId = "submitEmails";

let cachedParticipants;
let cachedIsSecretSanta;

export function init() {
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isSecretSanta, participants}) => {
    cachedParticipants = participants;
    cachedIsSecretSanta = isSecretSanta;
    if (isSecretSanta) {
      render();
    }
  });
  stateEvents.on(Events.NEXT_STEP, ({step, participants, isSecretSanta}) => {
    cachedParticipants = participants;
    cachedIsSecretSanta = isSecretSanta;
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
      ${cachedParticipants.map((participant, i) => emailInput(participant, i)).join("")}
        <div id="emailBtnDiv">
          <button class="button" id="${hideEmailsId}" style="display: none;">Dismiss</button>
          <button type="submit" class="button" id="${submitEmailsId}">Submit Emails</button>
        </div>
      </form>
    </div>`;
}

export function emailInput(participant, i) {
  const safeName = escapeAttr(participant.name);
  return `
    <div class="emailDiv">
      <label for=${i}>${safeName}</label>
      <input type="email"
             class="emailInput"
             maxlength="100"
             placeholder="${safeName}@example.com"
             name=${safeName}
             id=${i}
             value="${escapeAttr(participant.email || "")}"
             required/>
    </div>`;
}

function render() {
  const existing = selectElement(`#${emailTableId}`);
  if (existing) existing.remove();
  pushHTML("body", template());
  if (!cachedIsSecretSanta) selectElement(`#${hideEmailsId}`).style.display = "block";
  addEventListener(`#${emailTableBodyId}`, "submit", submitEmails);
  addEventListener(`#${hideEmailsId}`, "click", hideEmailTable);
  selectElement(`#${emailTableBodyId}`).addEventListener("input", (e) => {
    if (e.target.classList.contains("emailInput")) {
      e.target.classList.remove("duplicate-email");
    }
  });
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

function findDuplicateEmails() {
  const inputs = Array.from(document.getElementsByClassName("emailInput"));
  const emailCounts = {};
  inputs.forEach(input => {
    const email = input.value.trim().toLowerCase();
    emailCounts[email] = (emailCounts[email] || 0) + 1;
  });
  const duplicates = new Set(
    Object.keys(emailCounts).filter(email => emailCounts[email] > 1)
  );
  return {inputs, duplicates};
}

async function submitEmails(event) {
  event.preventDefault();
  const {inputs, duplicates} = findDuplicateEmails();
  if (duplicates.size > 0) {
    inputs.forEach(input => {
      if (duplicates.has(input.value.trim().toLowerCase())) {
        input.classList.add("duplicate-email");
      }
    });
    showError("Each participant must have a unique email address");
    return;
  }
  setLoadingState(`#${submitEmailsId}`);
  const emails = getEmails();
  const payload = getExchangePayload();
  payload.participants = payload.participants.map((p, i) => ({
    ...p,
    email: emails[i]?.email || p.email,
  }));

  await apiFetch("/.netlify/functions/api-exchange-post", {
    method: "POST",
    body: payload,
    onSuccess: () => addEmailsToParticipants(emails),
    onError: (msg) => showError(msg),
    fallbackMessage: "Failed to submit emails. Please try again.",
  });
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
