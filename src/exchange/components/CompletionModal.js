import {addEventListener, pushHTML, selectElement} from "../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import {resultsTableHtml} from "./EmailTable/SendResults.js";
import {bmcButtonHtml} from "../../BmcButton.js";
import {showError} from "../../Snackbar.js";
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
import confirmStyles from '../../../assets/styles/exchange/components/email-confirmation.module.css';
import dialogStyles from '../../../assets/styles/exchange/components/email-dialog.module.css';

const modalId = "completionModal";
const newExchangeBtnId = "newExchangeBtn";
const iconAttrs = `viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
const copyIcon = `<svg ${iconAttrs} data-icon="copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const checkIcon = `<svg ${iconAttrs} data-icon="check"><polyline points="20 6 9 17 4 12"/></svg>`;
const copiedResetMs = 2000;
let copiedTimer;

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
  return `<div class="${dialogStyles.linkCopyField}">
    <input type="text" id="linkExchangeUrl" aria-label="Exchange link. Click to copy." title="Click to copy" value="${url}" readonly>
    <button type="button" class="${dialogStyles.linkCopyBtn}" id="copyLinkBtn" aria-label="Copy link" title="Copy link">${copyIcon}</button>
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

function setCopyButton(button, icon, label) {
  button.innerHTML = icon;
  button.setAttribute("aria-label", label);
  button.title = label;
}

function showCopied() {
  const button = selectElement("#copyLinkBtn");
  setCopyButton(button, checkIcon, "Link copied");
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => setCopyButton(button, copyIcon, "Copy link"), copiedResetMs);
}

async function copyLink() {
  const input = selectElement("#linkExchangeUrl");
  input.select(); // Left selected so the link can be copied by hand if the clipboard fails.
  try {
    await navigator.clipboard.writeText(input.value);
    showCopied();
  } catch {
    showError("Couldn't copy the link. Please copy it manually.");
  }
}

function render(state) {
  selectElement(`#${modalId}`)?.remove();
  pushHTML("body", template(state));
  addEventListener(`#${newExchangeBtnId}`, "click", () => {
    location.reload();
  });
  if (state.mode === "link") {
    addEventListener("#linkExchangeUrl", "click", copyLink);
    addEventListener("#copyLinkBtn", "click", copyLink);
  }
}

function remove() {
  selectElement(`#${modalId}`)?.remove();
}

export function init() {
  stateEvents.on(Events.EXCHANGE_COMPLETE, render);
  stateEvents.on(Events.EXCHANGE_STARTED, remove);
}
