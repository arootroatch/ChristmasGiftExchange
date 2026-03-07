import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../../state.js";
import {addEventListener, pushHTML, selectElement, setLoadingState} from "../../../utils.js";
import {showError, showSuccess} from "../../../Snackbar.js";

const sendEmailsId = "sendEmails";
const sendEmailsBtnId = "sendEmailsBtn";

let cachedParticipants;
let cachedAssignments;

export function init() {
  stateEvents.on(Events.EMAILS_ADDED, ({participants, assignments}) => {
    cachedParticipants = participants;
    cachedAssignments = assignments;
    render();
  });
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    const el = selectElement(`#${sendEmailsId}`);
    if (el) el.remove();
  });
}

function template() {
  return `
    <div id="${sendEmailsId}" class="sendEmails show">
      <p>${cachedParticipants.length} email addresses added successfully!</p>
      <p>Now let's send out those emails:</p>
      <button class="button" id="${sendEmailsBtnId}">Send Emails</button>
    </div>`;
}

function render() {
  const existing = selectElement(`#${sendEmailsId}`);
  if (existing) existing.remove();
  pushHTML("body", template());
  addEventListener(`#${sendEmailsBtnId}`, "click", batchEmails);
}

function hideElement() {
  const el = selectElement(`#${sendEmailsId}`);
  el.classList.add("hide");
  setTimeout(() => {
    el.remove();
  }, 500);
}

async function batchEmails() {
  setLoadingState(`#${sendEmailsBtnId}`);

  try {
    const response = await fetch("/.netlify/functions/api-giver-notify-post", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        participants: cachedParticipants,
        assignments: cachedAssignments,
      }),
    });
    const data = await response.json();
    hideElement();
    showSuccess(`Sent ${data.sent} of ${data.total} emails successfully!`);
  } catch (error) {
    showError("Something went wrong sending emails");
  }
}
