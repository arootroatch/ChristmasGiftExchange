import {ExchangeEvents as Events, exchangeEvents as stateEvents, getExchangePayload, completeExchange} from "../../state.js";
import {addEventListener, pushHTML, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../../utils.js";
import {showError} from "../../../Snackbar.js";
import {removeFailedEmails, showFailedEmails, resetRetryCount} from "./FailedEmails.js";
import {confirmId, sendResultsFormId, showConfirmation, removeAll as removeAllSendResults} from "./SendResults.js";

const emailTableId = "emailTable";
const emailTableBodyId = "emailTableBody";
const hideEmailsId = "hideEmails";
const submitEmailsId = "submitEmails";
const sendResultsBtnId = "sendResultsBtn";

export function init() {
  stateEvents.on(Events.ORGANIZER_SET, (state) => {
    render(state);
  });
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    const emailTable = selectElement(`#${emailTableId}`);
    if (emailTable) emailTable.remove();
    removeAllSendResults();
    removeFailedEmails();
    resetRetryCount();
  });
}

function template({participants, heading, showDismiss = false, showSendResults = false}) {
  return `
    <div id="${emailTableId}" class="show">
      <h3>${heading}</h3>
      <form id="${emailTableBodyId}">
      ${participants.map((participant, i) => emailInput(participant, i)).join("")}
        <div id="emailBtnDiv">
          ${showDismiss ? `<button class="button" id="${hideEmailsId}">Dismiss</button>` : ""}
          <button type="submit" class="button" id="${submitEmailsId}">Submit Emails</button>
        </div>
      </form>
      ${showSendResults ? `<hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;"/>
      <p style="text-align:center;">Don't want to send out emails to everyone?</p>
      <div style="text-align:center;"><button class="button" id="${sendResultsBtnId}">Send Me the Results</button></div>` : ""}
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

function attachDuplicateClassRemoval() {
  selectElement(`#${emailTableBodyId}`).addEventListener("input", (e) => {
    if (e.target.classList.contains("emailInput")) {
      e.target.classList.remove("duplicate-email");
    }
  });
}

export function render(state) {
  const {isSecretSanta} = state;
  selectElement(`#${emailTableId}`)?.remove();
  pushHTML("body", template({
    ...state,
    heading: "Please enter each participant's email address",
    showDismiss: !isSecretSanta,
    showSendResults: true,
  }));
  addEventListener(`#${emailTableBodyId}`, "submit", submitEmails);
  if (!isSecretSanta) addEventListener(`#${hideEmailsId}`, "click", hideEmailTable);
  addEventListener(`#${sendResultsBtnId}`, "click", () => showConfirmation(state));
  attachDuplicateClassRemoval();
}

export function renderWithSubset(participants, assignments) {
  selectElement(`#${emailTableId}`)?.remove();
  removeFailedEmails();
  pushHTML("body", template({
    participants,
    heading: "Please correct the email addresses below and try again",
  }));
  addEventListener(`#${emailTableBodyId}`, "submit", (event) =>
    submitSubsetEmails(event, participants, assignments)
  );
  attachDuplicateClassRemoval();
}

function hideEmailTable() {
  const table = selectElement(`#${emailTableId}`);
  if (!table) return;
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

function validateAndCollectEmails(event) {
  event.preventDefault();
  const {inputs, duplicates} = findDuplicateEmails();
  if (duplicates.size > 0) {
    inputs.forEach(input => {
      if (duplicates.has(input.value.trim().toLowerCase())) {
        input.classList.add("duplicate-email");
      }
    });
    showError("Each participant must have a unique email address");
    return null;
  }
  setLoadingState(`#${submitEmailsId}`);
  return getEmails();
}

function mergeEmails(participants, emails) {
  return participants.map((p, i) => ({...p, email: emails[i]?.email || p.email}));
}

function handleEmailResponse(data, payload) {
  hideEmailTable();
  if (data.emailsFailed && data.emailsFailed.length > 0) {
    showFailedEmails(data.emailsFailed, payload, {
      onBack: (failedParticipants, failedAssignments) =>
        renderWithSubset(failedParticipants, failedAssignments),
    });
  } else {
    completeExchange("success");
  }
}

async function submitEmails(event) {
  const emails = validateAndCollectEmails(event);
  if (!emails) return;
  const payload = getExchangePayload();
  payload.participants = mergeEmails(payload.participants, emails);

  await apiFetch("/.netlify/functions/api-exchange-post", {
    method: "POST",
    body: payload,
    onSuccess: (data) => handleEmailResponse(data, payload),
    onError: (msg) => showError(msg),
    fallbackMessage: "Failed to submit emails. Please try again.",
  });
}

async function submitSubsetEmails(event, originalParticipants, originalAssignments) {
  const emails = validateAndCollectEmails(event);
  if (!emails) return;
  const participants = mergeEmails(originalParticipants, emails);
  const payload = {exchangeId: getExchangePayload().exchangeId, participants, assignments: originalAssignments};

  await apiFetch("/.netlify/functions/api-giver-retry-post", {
    method: "POST",
    body: payload,
    onSuccess: (data) => handleEmailResponse(data, payload),
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
