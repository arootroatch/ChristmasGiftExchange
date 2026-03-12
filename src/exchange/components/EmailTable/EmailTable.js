import {ExchangeEvents as Events, exchangeEvents as stateEvents, getExchangePayload} from "../../state.js";
import {addEventListener, pushHTML, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../../utils.js";
import {showError, showSuccess} from "../../../Snackbar.js";

const emailTableId = "emailTable";
const emailTableBodyId = "emailTableBody";
const hideEmailsId = "hideEmails";
const submitEmailsId = "submitEmails";
const sendResultsBtnId = "sendResultsBtn";
const confirmId = "sendResultsConfirm";
const confirmBtnId = "sendResultsConfirmBtn";
const cancelBtnId = "sendResultsCancelBtn";
const sendResultsFormId = "sendResults";
const sendResultsNameId = "sendResultsName";
const sendResultsEmailId = "sendResultsEmail";
const sendResultsSubmitId = "sendResultsSubmit";

export function init() {
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, (state) => {
    if (state.isSecretSanta) {
      render(state);
    }
  });
  stateEvents.on(Events.NEXT_STEP, (state) => {
    if (state.step === 4) {
      render(state);
    }
  });
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    const emailTable = selectElement(`#${emailTableId}`);
    if (emailTable) emailTable.remove();
    selectElement(`#${confirmId}`)?.remove();
    selectElement(`#${sendResultsFormId}`)?.remove();
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

function render(state) {
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
    onSuccess: () => hideEmailTable(),
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

// Send Results — confirmation + form

function confirmationTemplate({isSecretSanta}) {
  let html = `
    <div id="${confirmId}" class="sendEmails show">
      <p>Your exchange will not be saved. Recipients will not be able to look up wishlists or contact info. Be sure to save your results email or take a screenshot!</p>`;
  if (isSecretSanta) {
    html += `<p>This will reveal all gift exchange assignments on your screen.</p>`;
  }
  html += `
      <div>
        <button class="button" id="${confirmBtnId}">Continue</button>
        <button class="button" id="${cancelBtnId}">Cancel</button>
      </div>
    </div>`;
  return html;
}

function showConfirmation(state) {
  pushHTML("body", confirmationTemplate(state));
  addEventListener(`#${confirmBtnId}`, "click", () => showResultsForm(state));
  addEventListener(`#${cancelBtnId}`, "click", () => {
    selectElement(`#${confirmId}`)?.remove();
  });
}

function resultsTableHtml({assignments}) {
  let html = '<div class="results-card" style="margin: 0 auto;"><h2>Results</h2><div class="results-header"><span>Giver</span><span></span><span>Recipient</span></div><div>';
  for (const a of assignments) {
    html += `<div class="result-row"><span>${a.giver}</span><span class="result-arrow">&#8594;</span><span>${a.recipient}</span></div>`;
  }
  html += '</div></div>';
  return html;
}

function resultsFormTemplate({isSecretSanta, participants, assignments}) {
  let html = `<div id="${sendResultsFormId}" class="sendEmails show">`;
  if (isSecretSanta) {
    html += resultsTableHtml({assignments});
  }
  html += `
      <div style="display:flex; flex-direction:column; align-items:center; gap:8px; padding:10px;">
      <div><label for="${sendResultsNameId}">Your name: </label><select id="${sendResultsNameId}" required>
          <option disabled selected value="">-- Select your name --</option>
          ${participants.map(p => `<option value="${p.name}">${p.name}</option>`).join("")}
      </select></div>
      <div><label for="${sendResultsEmailId}">Your email: </label><input type="email" id="${sendResultsEmailId}" placeholder="your@email.com" required/></div>
      <button class="button" id="${sendResultsSubmitId}">Send</button>
      </div>
    </div>`;
  return html;
}

function showResultsForm(state) {
  selectElement(`#${confirmId}`)?.remove();
  selectElement(`#${emailTableId}`)?.remove();
  pushHTML("body", resultsFormTemplate(state));
  addEventListener(`#${sendResultsSubmitId}`, "click", () => submitResults(state));
}

async function submitResults({assignments}) {
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
    body: {name, email, assignments},
    onSuccess: () => {
      showSuccess("Results sent!");
      selectElement(`#${sendResultsFormId}`)?.remove();
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
