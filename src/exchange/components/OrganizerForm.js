import {ExchangeEvents as Events, exchangeEvents as stateEvents, setOrganizer} from "../state.js";
import {addEventListener, apiFetch, pushHTML, selectElement, setLoadingState} from "../../utils.js";
import {showError} from "../../Snackbar.js";

const containerId = "organizerFormContainer";
const formId = "organizerForm";
const nameInputId = "organizerName";
const emailInputId = "organizerEmail";
const submitBtnId = "organizerSubmit";

export function init() {
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, (state) => {
    if (state.isSecretSanta) {
      render();
    }
  });
  stateEvents.on(Events.EMAIL_RESULTS_REQUESTED, () => {
    render();
  });
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    selectElement(`#${containerId}`)?.remove();
  });
}

function template() {
  return `
    <div id="${containerId}" class="show">
      <h3>Who's organizing this exchange?</h3>
      <form id="${formId}">
        <div class="emailDiv">
          <label for="${nameInputId}">Your Name</label>
          <input type="text" id="${nameInputId}" maxlength="100" placeholder="Your name" required/>
        </div>
        <div class="emailDiv">
          <label for="${emailInputId}">Your Email</label>
          <input type="email" id="${emailInputId}" maxlength="100" placeholder="you@example.com" required/>
        </div>
        <div id="emailBtnDiv">
          <button type="submit" class="button" id="${submitBtnId}">Continue</button>
        </div>
      </form>
    </div>`;
}

function render() {
  selectElement(`#${containerId}`)?.remove();
  pushHTML("body", template());
  addEventListener(`#${formId}`, "submit", handleSubmit);
}

async function handleSubmit(event) {
  event.preventDefault();
  const name = selectElement(`#${nameInputId}`).value.trim();
  const email = selectElement(`#${emailInputId}`).value.trim();

  if (!name || !email) return;

  setLoadingState(`#${submitBtnId}`);

  await apiFetch("/.netlify/functions/api-organizer-post", {
    method: "POST",
    body: {name, email},
    onSuccess: (data) => {
      selectElement(`#${containerId}`)?.remove();
      setOrganizer(name, email, data.token);
    },
    onError: (msg) => showError(msg),
    fallbackMessage: "Failed to register organizer. Please try again.",
  });
}
