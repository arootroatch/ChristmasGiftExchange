import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../../exchangeState.js";
import {addEventListener, pushHTML, selectElement, setLoadingState} from "../../utils.js";
import {showSuccess} from "../Snackbar.js";

const sendEmailsId = "sendEmails";
const sendEmailsBtnId = "sendEmailsBtn";

let cachedParticipants;
let cachedAssignments;
let cachedTokenMap;

export function init() {
  stateEvents.on(Events.EMAILS_ADDED, ({participants, assignments, _tokenMap}) => {
    cachedParticipants = participants;
    cachedAssignments = assignments;
    cachedTokenMap = _tokenMap;
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
  const tokenMap = cachedTokenMap || [];

  let count = 0;
  let promises = cachedAssignments.map(async (assignment) => {
    const participant = cachedParticipants.find(p => p.name === assignment.giver);
    const giverTokenInfo = tokenMap.find(t => t.name === assignment.giver);
    try {
      const response = await fetch("/.netlify/functions/api-giver-notify-post", {
        method: "POST",
        mode: "cors",
        body: JSON.stringify({
          name: assignment.giver,
          recipient: assignment.recipient,
          email: participant.email,
          wishlistEditUrl: giverTokenInfo
            ? `${window.location.origin}/wishlist/edit/${giverTokenInfo.token}`
            : null
        }),
      });
      if (response.status === 200) count++;
    } catch (error) {
      console.error(`Failed to send email to ${participant.email}:`, error);
    }
  });

  await Promise.all(promises);
  hideElement();
  showSuccess(`Sent ${count} of ${cachedParticipants.length} emails successfully!`);
}
