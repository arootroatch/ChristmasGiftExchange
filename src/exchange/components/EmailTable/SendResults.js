import {addEventListener, pushHTML, selectElement, setLoadingState, clearLoadingState, escapeAttr, apiFetch} from "../../../utils.js";
import {showError, showSuccess} from "../../../Snackbar.js";
import {render as renderEmailTable} from "./EmailTable.js";

const confirmId = "sendResultsConfirm";
const confirmBtnId = "sendResultsConfirmBtn";
const cancelBtnId = "sendResultsCancelBtn";
const sendResultsFormId = "sendResults";
const sendResultsBackBtnId = "sendResultsBackBtn";
const sendResultsNameId = "sendResultsName";
const sendResultsEmailId = "sendResultsEmail";
const sendResultsSubmitId = "sendResultsSubmit";

export {confirmId, sendResultsFormId};

export function removeAll() {
  selectElement(`#${confirmId}`)?.remove();
  selectElement(`#${sendResultsFormId}`)?.remove();
}

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

export function showConfirmation(state) {
  pushHTML("body", confirmationTemplate(state));
  addEventListener(`#${confirmBtnId}`, "click", () => showResultsForm(state));
  addEventListener(`#${cancelBtnId}`, "click", () => {
    selectElement(`#${confirmId}`)?.remove();
  });
}

function resultsTableHtml({assignments}) {
  let html = '<div class="results-card" style="margin: 0 auto;"><h2>Results</h2><div class="results-header"><span>Giver</span><span></span><span>Recipient</span></div><div>';
  for (const a of assignments) {
    html += `<div class="result-row"><span>${escapeAttr(a.giver)}</span><span class="result-arrow">&#8594;</span><span>${escapeAttr(a.recipient)}</span></div>`;
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
          ${participants.map(p => `<option value="${escapeAttr(p.name)}">${escapeAttr(p.name)}</option>`).join("")}
      </select></div>
      <div><label for="${sendResultsEmailId}">Your email: </label><input type="email" id="${sendResultsEmailId}" placeholder="your@email.com" required/></div>
      <button class="button" id="${sendResultsSubmitId}">Send</button>
      <button class="button" id="${sendResultsBackBtnId}">\u2190 Back</button>
      </div>
    </div>`;
  return html;
}

export function showResultsForm(state) {
  selectElement(`#${confirmId}`)?.remove();
  selectElement("#emailTable")?.remove();
  pushHTML("body", resultsFormTemplate(state));
  addEventListener(`#${sendResultsSubmitId}`, "click", () => submitResults(state));
  addEventListener(`#${sendResultsBackBtnId}`, "click", () => {
    selectElement(`#${sendResultsFormId}`)?.remove();
    renderEmailTable(state);
  });
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
      clearLoadingState(`#${sendResultsSubmitId}`);
    },
    fallbackMessage: "Failed to send results. Please try again.",
  });
}
