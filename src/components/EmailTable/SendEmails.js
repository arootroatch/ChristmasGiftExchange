import {state} from "../../state.js";
import {addEventListener, fetchWithErrorHandling, pushHTML, selectElement, setLoadingState} from "../../utils.js";
import {showSuccess} from "../Snackbar.js";
import {Events, stateEvents} from "../../Events.js";

const sendEmailsId = "sendEmails";
const sendEmailsBtnId = "sendEmailsBtn";

export function init() {
  stateEvents.on(Events.EMAILS_ADDED, () => {
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
      <p>${state.givers.length} email addresses added successfully!</p>
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

function dispatchEmailOptions(giver) {
  return {
    method: "POST",
    mode: "cors",
    body: JSON.stringify({
      name: giver.name,
      recipient: giver.recipient,
      email: giver.email,
    }),
  };
}

async function batchEmails() {
  setLoadingState(`#${sendEmailsBtnId}`);

  let count = 0;
  let promises = state.givers.map(async (giver) => {
    try {
      const response = await fetchWithErrorHandling("/.netlify/functions/dispatchEmail", dispatchEmailOptions(giver));
      if (response.status === 200) count++;
    } catch (error) {
      console.error(`Failed to send email to ${giver.email}:`, error);
    }
  });

  await Promise.all(promises);
  hideElement();
  showSuccess(`Sent ${count} of ${state.givers.length} emails successfully!`);
}
