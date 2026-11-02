import {addEventListener, pushHTML, selectElement} from "../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import {resultsTableHtml} from "./EmailTable/SendResults.js";
import {bmcButtonHtml} from "../../BmcButton.js";
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
import confirmStyles from '../../../assets/styles/exchange/components/email-confirmation.module.css';
import dialogStyles from '../../../assets/styles/exchange/components/email-dialog.module.css';

const modalId = "completionModal";
const newExchangeBtnId = "newExchangeBtn";

function messageForMode(mode) {
  if (mode === "error") {
    return `<p>We were unable to send the remaining emails. Please contact these participants directly.</p>`;
  }
  if (mode === "success") {
    return `<p>Your exchange has been saved and emails have been sent. Thanks for using Gift Exchange Generator!</p>`;
  }
  return `<p>Thanks for using Gift Exchange Generator!</p>`;
}

function linkSectionHtml(exchangeId) {
  const url = `${location.origin}/draw?id=${exchangeId}`;
  return `<div class="${dialogStyles.emailDiv}">
    <input type="text" id="linkExchangeUrl" value="${url}" readonly>
    <button class="${btnStyles.button}" id="copyLinkBtn">Copy Link</button>
  </div>
  <p>Send this link to everyone in the exchange. Each person opens it, picks their name, and sees their recipient.</p>`;
}

function template({mode, assignments, exchangeId}) {
  let html = `<div id="${modalId}" class="${confirmStyles.sendEmails} show">`;
  if (mode === "results") {
    html += resultsTableHtml({assignments});
  }
  if (mode === "link") {
    html += linkSectionHtml(exchangeId);
  }
  html += messageForMode(mode);
  html += bmcButtonHtml();
  html += `<button class="${btnStyles.button}" id="${newExchangeBtnId}">Start New Exchange</button>`;
  html += `</div>`;
  return html;
}

function render(state) {
  selectElement(`#${modalId}`)?.remove();
  pushHTML("body", template(state));
  addEventListener(`#${newExchangeBtnId}`, "click", () => {
    location.reload();
  });
  if (state.mode === "link") {
    addEventListener("#copyLinkBtn", "click", () => {
      navigator.clipboard?.writeText(selectElement("#linkExchangeUrl").value);
    });
  }
}

function remove() {
  selectElement(`#${modalId}`)?.remove();
}

export function init() {
  stateEvents.on(Events.EXCHANGE_COMPLETE, render);
  stateEvents.on(Events.EXCHANGE_STARTED, remove);
}
