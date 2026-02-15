import {addEventListener, fetchWithErrorHandling, removeEventListener, selectElement, setLoadingState, escapeHTML} from "../utils";

const emailQueryId = "emailQuery";
const emailQueryBtnId = "emailQueryBtn";
const queryDivId = "query";

export const emailQueryInput =
  `<div>
        <input
            type="email"
            maxlength="100"
            id="${emailQueryId}"
            placeholder="Enter your email to search"
        />
        <button
            type="submit"
            class="button queryBtn"
            id="${emailQueryBtnId}"
        >
        Search it!
        </button>
    </div>`

export const emailQueryInit =
  `<label for="${emailQueryId}">
        Need to know who you're buying a gift for?
    </label>
    ${emailQueryInput}`

export const emailQueryError =
  `<div style="color:#b31e20">
        Email address not found!
    </div>`

export function emailQueryResult(date, recipient) {
  return `
    <div>
        As of ${escapeHTML(date.toDateString())}, you're buying a gift for <span>${escapeHTML(recipient)}!</span>
    </div>
    ${emailQueryInput}`;
}

function renderResult(results) {
  const timestamp = Date.parse(results.date);
  const date = new Date(timestamp);
  const queryDiv = selectElement(`#${queryDivId}`);

  queryDiv.innerHTML = emailQueryResult(date, results.recipient);
  addEventListener(`#${emailQueryBtnId}`, "click", getName);
}

function renderError() {
  const queryDiv = selectElement(`#${queryDivId}`);

  queryDiv.innerHTML = emailQueryError;
  setTimeout(() => {
    queryDiv.innerHTML = emailQueryInit;
    addEventListener(`#${emailQueryBtnId}`, "click", getName);
  }, 2000);
}

function renderLoadingState() {
  setLoadingState(`#${emailQueryBtnId}`);
  removeEventListener(`#${emailQueryBtnId}`, "click", getName);
}

async function getName(e) {
  e.preventDefault();
  const email = selectElement(`#${emailQueryId}`).value;
  renderLoadingState();

  const options = {
    method: "POST",
    mode: "cors",
    body: email,
  };

  try {
    const response = await fetchWithErrorHandling("/.netlify/functions/get_name", options);
    const results = await response.json();
    renderResult(results);
  } catch (error) {
    console.error('Error fetching name:', error);
    renderError();
  }
}

export function init() {
  addEventListener(`#${emailQueryBtnId}`, "click", getName);
}