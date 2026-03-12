import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../../state.js";
import {addEventListener, pushHTML, selectElement, setLoadingState, apiFetch} from "../../../utils.js";
import {showError, showSuccess} from "../../../Snackbar.js";

const sendEmailsId = "sendEmails";
const sendEmailsBtnId = "sendEmailsBtn";

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    const el = selectElement(`#${sendEmailsId}`);
    if (el) el.remove();
  });
}

function template({participants}) {
  return `
    <div id="${sendEmailsId}" class="sendEmails show">
      <p>${participants.length} email addresses added successfully!</p>
      <p>Now let's send out those emails:</p>
      <button class="button" id="${sendEmailsBtnId}">Send Emails</button>
    </div>`;
}

function render(state) {
  const existing = selectElement(`#${sendEmailsId}`);
  if (existing) existing.remove();
  pushHTML("body", template(state));
  addEventListener(`#${sendEmailsBtnId}`, "click", () => batchEmails(state));
}

function hideElement() {
  const el = selectElement(`#${sendEmailsId}`);
  el.classList.add("hide");
  setTimeout(() => {
    el.remove();
  }, 500);
}

async function batchEmails({participants, assignments}) {
  setLoadingState(`#${sendEmailsBtnId}`);

  await apiFetch("/.netlify/functions/api-giver-notify-post", {
    method: "POST",
    body: {participants, assignments},
    onSuccess: (data) => {
      hideElement();
      showSuccess(`Sent ${data.sent} of ${data.total} emails successfully!`);
    },
    onError: (msg) => {
      showError(msg);
      render({participants, assignments});
    },
    fallbackMessage: "Failed to send emails. Please try again.",
  });
}
