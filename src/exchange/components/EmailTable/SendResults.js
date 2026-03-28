import {addEventListener, pushHTML, selectElement, escapeAttr, apiFetch} from "../../../utils.js";
import {showError} from "../../../Snackbar.js";
import {completeExchange} from "../../state.js";
import btnStyles from '../../../../assets/styles/exchange/components/buttons.module.css';
import {tableStyles} from '../ResultsTable.js';
import confirmStyles from '../../../../assets/styles/exchange/components/email-confirmation.module.css';

const confirmId = "sendResultsConfirm";
const confirmBtnId = "sendResultsConfirmBtn";
const cancelBtnId = "sendResultsCancelBtn";

export {confirmId};

export function removeAll() {
  selectElement(`#${confirmId}`)?.remove();
}

export function resultsTableHtml({assignments}) {
  let html = `<div class="${tableStyles.resultsCard} ${tableStyles.embedded}"><h2>Results</h2><div class="${tableStyles.resultsHeader}"><span>Giver</span><span></span><span>Recipient</span></div><div>`;
  for (const a of assignments) {
    html += `<div class="${tableStyles.resultRow}"><span>${escapeAttr(a.giver)}</span><span class="${tableStyles.resultArrow}">&#8594;</span><span>${escapeAttr(a.recipient)}</span></div>`;
  }
  html += '</div></div>';
  return html;
}

function confirmationTemplate({isSecretSanta}) {
  let html = `
    <div id="${confirmId}" class="${confirmStyles.sendEmails} show">
      <p>Your exchange will not be saved. Recipients will not be able to look up wishlists or contact info. Be sure to save your results email or take a screenshot!</p>`;
  if (isSecretSanta) {
    html += `<p>This will reveal all gift exchange assignments on your screen.</p>`;
  }
  html += `
      <div>
        <button class="${btnStyles.button}" id="${confirmBtnId}">Continue</button>
        <button class="${btnStyles.button}" id="${cancelBtnId}">Cancel</button>
      </div>
    </div>`;
  return html;
}

export function showConfirmation(state) {
  pushHTML("body", confirmationTemplate(state));
  addEventListener(`#${confirmBtnId}`, "click", () => submitResults(state));
  addEventListener(`#${cancelBtnId}`, "click", () => {
    selectElement(`#${confirmId}`)?.remove();
  });
}

async function submitResults({assignments}) {
  selectElement(`#${confirmId}`)?.remove();

  await apiFetch("/.netlify/functions/api-results-email-post", {
    method: "POST",
    body: {assignments},
    onSuccess: () => {
      completeExchange("success");
    },
    onError: (msg) => {
      showError(msg);
    },
    fallbackMessage: "Failed to send results. Please try again.",
  });
}
