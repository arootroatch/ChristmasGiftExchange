import {ExchangeEvents as Events, exchangeEvents as stateEvents, getExchangePayload} from "../../state.js";
import {addEventListener, pushHTML, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../../utils.js";
import {showError, showSuccess} from "../../../Snackbar.js";
import {removeFailedEmails, showFailedEmails} from "./FailedEmails.js";
import {confirmId, sendResultsFormId, showConfirmation, removeAll as removeAllSendResults} from "./SendResults.js";

const emailTableId = "emailTable";
const emailTableBodyId = "emailTableBody";
const hideEmailsId = "hideEmails";
const submitEmailsId = "submitEmails";
const sendResultsBtnId = "sendResultsBtn";

export function init() {
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, (state) => {
    if (state.isSecretSanta) {
      render(state);
    }
  });
  stateEvents.on(Events.EMAIL_RESULTS_REQUESTED, (state) => {
    render(state);
  });
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    const emailTable = selectElement(`#${emailTableId}`);
    if (emailTable) emailTable.remove();
    removeAllSendResults();
    removeFailedEmails();
  });
}

function template({participants}) {
  return `
    <div id="${emailTableId}" class="show">
      <h3>Please enter each participant's email address</h3>
      <form id="${emailTableBodyId}">
      ${participants.map((participant, i) => emailInput(participant, i)).join("")}
        <div id="emailBtnDiv">
          <button class="button" id="${hideEmailsId}" style="display: none;">Dismiss</button>
          <button type="submit" class="button" id="${submitEmailsId}">Submit Emails</button>
        </div>
      </form>
      <hr style="border-color: rgba(255,255,255,0.1); margin: 10px 0;"/>
      <p style="text-align:center;">Don't want to send out emails to everyone?</p>
      <div style="text-align:center;"><button class="button" id="${sendResultsBtnId}">Send Me the Results</button></div>
    </div>`;
}

function subsetTemplate({participants}) {
  return `
    <div id="${emailTableId}" class="show">
      <h3>Please correct the email addresses below and try again</h3>
      <form id="${emailTableBodyId}">
      ${participants.map((participant, i) => emailInput(participant, i)).join("")}
        <div id="emailBtnDiv">
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

export function render(state) {
  const {isSecretSanta} = state;
  const existing = selectElement(`#${emailTableId}`);
  if (existing) existing.remove();
  pushHTML("body", template(state));
  if (!isSecretSanta) selectElement(`#${hideEmailsId}`).style.display = "block";
  addEventListener(`#${emailTableBodyId}`, "submit", submitEmails);
  addEventListener(`#${hideEmailsId}`, "click", hideEmailTable);
  addEventListener(`#${sendResultsBtnId}`, "click", () => showConfirmation(state));
  selectElement(`#${emailTableBodyId}`).addEventListener("input", (e) => {
    if (e.target.classList.contains("emailInput")) {
      e.target.classList.remove("duplicate-email");
    }
  });
}

export function renderWithSubset(participants, assignments) {
  const existing = selectElement(`#${emailTableId}`);
  if (existing) existing.remove();
  removeFailedEmails();
  pushHTML("body", subsetTemplate({participants}));
  addEventListener(`#${emailTableBodyId}`, "submit", (event) =>
    submitSubsetEmails(event, participants, assignments)
  );
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
    onSuccess: (data) => {
      hideEmailTable();
      if (data.emailsFailed && data.emailsFailed.length > 0) {
        showFailedEmails(data.emailsFailed, payload, {
          onBack: (failedParticipants, failedAssignments) =>
            renderWithSubset(failedParticipants, failedAssignments),
        });
      } else {
        showSuccess("Exchange saved and emails sent!");
      }
    },
    onError: (msg) => showError(msg),
    fallbackMessage: "Failed to submit emails. Please try again.",
  });
}

async function submitSubsetEmails(event, originalParticipants, originalAssignments) {
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
  const participants = originalParticipants.map((p, i) => ({
    ...p,
    email: emails[i]?.email || p.email,
  }));
  const assignments = originalAssignments;

  await apiFetch("/.netlify/functions/api-giver-notify-post", {
    method: "POST",
    body: {participants, assignments},
    onSuccess: (data) => {
      hideEmailTable();
      if (data.emailsFailed && data.emailsFailed.length > 0) {
        showFailedEmails(data.emailsFailed, {participants, assignments}, {
          onBack: (failedParticipants, failedAssignments) =>
            renderWithSubset(failedParticipants, failedAssignments),
        });
      } else {
        showSuccess("Emails sent successfully!");
      }
    },
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
