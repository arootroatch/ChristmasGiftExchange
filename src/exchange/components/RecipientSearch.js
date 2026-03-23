import {addEventListener, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../utils";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import {queryDivId, recipientSearchTemplate} from "../firstScreenTemplates.js";
import {authGateTemplate, initAuthGate} from "../../authGate.js";

const wishlistEmailBtnId = "wishlistEmailBtn";
const recipientSearchBtnId = "recipientSearchBtn";

const recipientSearchInput =
  `<div>
        <button
            type="submit"
            class="button queryBtn"
            id="${recipientSearchBtnId}"
        >
        Search it!
        </button>
    </div>`;

export function recipientSearchResult(date, giverName, recipient, exchangeId) {
  const who = giverName
    ? `<span>${escapeAttr(giverName)}</span> is`
    : `You're`;
  const wishlistBtn = exchangeId
    ? `<button class="button queryBtn" id="${wishlistEmailBtnId}">Email Me ${escapeAttr(recipient)}'s Wish List</button>`
    : '';
  return `
    <div>
        <p>${who} buying a gift for <span>${escapeAttr(recipient)}!</span></p>
        <p class="date-secondary">As of ${escapeAttr(date.toDateString())}</p>
        ${wishlistBtn}
    </div>
    ${recipientSearchInput}`;
}

function renderResult(results) {
  const timestamp = Date.parse(results.date);
  const date = new Date(timestamp);
  const queryDiv = selectElement(`#${queryDivId}`);

  queryDiv.innerHTML = recipientSearchResult(date, results.giverName, results.recipient, results.exchangeId);
  addEventListener(`#${recipientSearchBtnId}`, "click", getName);

  if (results.exchangeId) {
    addEventListener(`#${wishlistEmailBtnId}`, "click", (e) =>
      sendWishlistEmail(e, results.exchangeId)
    );
  }
}

function renderError(message = "Something went wrong!") {
  const queryDiv = selectElement(`#${queryDivId}`);
  queryDiv.innerHTML = '<div style="color:rgba(255,100,100,0.9)"></div>';
  queryDiv.firstElementChild.textContent = message;
  setTimeout(() => {
    renderAuthGate();
  }, 2000);
}

async function getName(e) {
  if (e) e.preventDefault();
  const btn = document.querySelector(`#${recipientSearchBtnId}`);
  if (btn) setLoadingState(`#${recipientSearchBtnId}`);

  await apiFetch("/.netlify/functions/api-recipient-get", {
    method: "GET",
    onSuccess: (data) => renderResult(data),
    onError: (msg) => renderError(msg),
    fallbackMessage: "Could not find your recipient. Please try again.",
  });
}

async function sendWishlistEmail(e, exchangeId) {
  e.preventDefault();
  setLoadingState(`#${wishlistEmailBtnId}`);

  await apiFetch("/.netlify/functions/api-wishlist-email-post", {
    method: "POST",
    body: {exchangeId},
    onSuccess: () => {
      const btn = selectElement(`#${wishlistEmailBtnId}`);
      btn.textContent = "Email sent!";
      btn.disabled = true;
    },
    onError: (msg) => {
      const btn = selectElement(`#${wishlistEmailBtnId}`);
      btn.textContent = msg || "Failed to send email";
      btn.disabled = true;
    },
    fallbackMessage: "Failed to send email. Please try again.",
  });
}

function renderAuthGate() {
  const queryDiv = selectElement(`#${queryDivId}`);
  queryDiv.innerHTML = authGateTemplate({heading: "Find Your Recipient"});
  initAuthGate({
    onSuccess: () => getName(),
    onError: (msg) => renderError(msg),
  });
}

export function init() {
  selectElement('[data-slot="recipient-search"]').innerHTML = recipientSearchTemplate();
  renderAuthGate();
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    selectElement('[data-slot="recipient-search"]').innerHTML = "";
  });
}
