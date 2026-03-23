import {addEventListener, removeEventListener, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../utils";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import {
  recipientSearchId,
  recipientSearchBtnId,
  queryDivId,
  recipientSearchInput,
  recipientSearchInit,
  recipientSearchTemplate,
} from "../firstScreenTemplates.js";

const wishlistEmailBtnId = "wishlistEmailBtn";

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

function renderResult(results, token) {
  const timestamp = Date.parse(results.date);
  const date = new Date(timestamp);
  const queryDiv = selectElement(`#${queryDivId}`);

  queryDiv.innerHTML = recipientSearchResult(date, results.giverName, results.recipient, results.exchangeId);
  addEventListener(`#${recipientSearchBtnId}`, "click", getName);

  if (results.exchangeId) {
    addEventListener(`#${wishlistEmailBtnId}`, "click", (e) =>
      sendWishlistEmail(e, token, results.exchangeId)
    );
  }
}

function renderError(message = "Token not found!") {
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
  const token = selectElement(`#${recipientSearchId}`).value;
  renderLoadingState();

  await apiFetch("/.netlify/functions/api-recipient-get", {
    method: "GET",
    onSuccess: (data) => renderResult(data, token),
    onError: (msg) => renderError(msg),
    fallbackMessage: "Token not found. Please try again.",
  });
}

async function sendWishlistEmail(e, token, exchangeId) {
  e.preventDefault();
  setLoadingState(`#${wishlistEmailBtnId}`);

  await apiFetch("/.netlify/functions/api-wishlist-email-post", {
    method: "POST",
    body: {token, exchangeId},
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

export function init() {
  selectElement('[data-slot="recipient-search"]').innerHTML = recipientSearchTemplate();
  addEventListener(`#${recipientSearchBtnId}`, "click", getName);
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    selectElement('[data-slot="recipient-search"]').innerHTML = "";
  });
}
