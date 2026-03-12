import {addEventListener, removeEventListener, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../utils";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";

const recipientSearchId = "recipientSearch";
const recipientSearchBtnId = "recipientSearchBtn";
const queryDivId = "query";

export const recipientSearchInput =
  `<div>
        <input
            type="email"
            maxlength="100"
            id="${recipientSearchId}"
            placeholder="you@example.com"
        />
        <button
            type="submit"
            class="button queryBtn"
            id="${recipientSearchBtnId}"
        >
        Search it!
        </button>
    </div>`

export const recipientSearchInit =
  `<label for="${recipientSearchId}">
        Need to know who you're buying a gift for?
    </label>
    ${recipientSearchInput}`

export function recipientSearchResult(date, recipient) {
  return `
    <div>
        As of ${escapeAttr(date.toDateString())}, you're buying a gift for <span>${escapeAttr(recipient)}!</span>
    </div>
    ${recipientSearchInput}`;
}

function renderResult(results) {
  const timestamp = Date.parse(results.date);
  const date = new Date(timestamp);
  const queryDiv = selectElement(`#${queryDivId}`);

  let html = recipientSearchResult(date, results.recipient);
  if (results.wishlistViewUrl) {
    html += `<a href="${escapeAttr(results.wishlistViewUrl)}" class="button" style="margin-top: 10px; display: inline-block;">View Wishlist</a>`;
  }

  queryDiv.innerHTML = html;
  addEventListener(`#${recipientSearchBtnId}`, "click", getName);
}

function renderError(message = "Email address not found!") {
  const queryDiv = selectElement(`#${queryDivId}`);
  queryDiv.innerHTML = '<div style="color:rgba(255,100,100,0.9)"></div>';
  queryDiv.firstElementChild.textContent = message;
  setTimeout(() => {
    queryDiv.innerHTML = recipientSearchInit;
    addEventListener(`#${recipientSearchBtnId}`, "click", getName);
  }, 2000);
}

function renderLoadingState() {
  setLoadingState(`#${recipientSearchBtnId}`);
  removeEventListener(`#${recipientSearchBtnId}`, "click", getName);
}

async function getName(e) {
  e.preventDefault();
  const email = selectElement(`#${recipientSearchId}`).value;
  renderLoadingState();

  await apiFetch(`/.netlify/functions/api-recipient-get?email=${encodeURIComponent(email)}`, {
    onSuccess: (data) => renderResult(data),
    onError: (msg) => renderError(msg),
    fallbackMessage: "Email address not found. Please try again.",
  });
}

function template() {
  return `<div id="${queryDivId}" class="recipientSearch">${recipientSearchInit}</div>`;
}

export function init() {
  selectElement('[data-slot="recipient-search"]').innerHTML = template();
  addEventListener(`#${recipientSearchBtnId}`, "click", getName);
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    selectElement('[data-slot="recipient-search"]').innerHTML = "";
  });
}
