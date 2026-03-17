import {addEventListener, pushHTML, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../../utils.js";
import {completeExchange} from "../../state.js";

const failedEmailsId = "failedEmails";
const retryEmailsBtnId = "retryEmailsBtn";
const backToEmailsBtnId = "backToEmailsBtn";
const viewResultsBtnId = "viewResultsBtn";

let retryCount = 0;

export function resetRetryCount() {
  retryCount = 0;
}

export function removeFailedEmails() {
  selectElement(`#${failedEmailsId}`)?.remove();
}

function failedEmailsTemplate(emailsFailed) {
  return `
    <div id="${failedEmailsId}" class="sendEmails show">
      <p>Your exchange data has been saved. You can retrieve it by entering a participant's email in the recipient search on the home page.</p>
      <p>However, we were unable to send emails to the following addresses:</p>
      <ul>${emailsFailed.map(e => `<li>${escapeAttr(e)}</li>`).join('')}</ul>
      <button class="button" id="${retryEmailsBtnId}">Retry</button>
      <button class="button" id="${backToEmailsBtnId}">\u2190 Back</button>
    </div>`;
}

function finalFailureTemplate(emailsFailed) {
  return `
    <div id="${failedEmailsId}" class="sendEmails show">
      <p>Your exchange data has been saved. You can retrieve it by entering a participant's email in the recipient search on the home page.</p>
      <p>We're sorry, but we were unable to send emails to the following addresses after multiple attempts:</p>
      <ul>${emailsFailed.map(e => `<li>${escapeAttr(e)}</li>`).join('')}</ul>
      <p>Please contact these participants directly.</p>
      <button class="button" id="${viewResultsBtnId}">View Results</button>
    </div>`;
}

export function showFailedEmails(emailsFailed, payload, {onBack} = {}) {
  const {exchangeId} = payload;
  const failedAssignments = payload.assignments.filter(a => {
    const participant = payload.participants.find(p => p.name === a.giver);
    return participant && emailsFailed.includes(participant.email);
  });
  const failedParticipants = payload.participants.filter(p =>
    emailsFailed.includes(p.email)
  );

  if (retryCount >= 1) {
    pushHTML("body", finalFailureTemplate(emailsFailed));
    addEventListener(`#${viewResultsBtnId}`, "click", () => {
      completeExchange("results");
    });
  } else {
    pushHTML("body", failedEmailsTemplate(emailsFailed));
    addEventListener(`#${retryEmailsBtnId}`, "click", () =>
      retryFailedEmails(failedParticipants, failedAssignments, exchangeId, onBack)
    );
    addEventListener(`#${backToEmailsBtnId}`, "click", () => {
      removeFailedEmails();
      if (onBack) onBack(failedParticipants, failedAssignments);
    });
  }
}

async function retryFailedEmails(participants, assignments, exchangeId, onBack) {
  setLoadingState(`#${retryEmailsBtnId}`);

  await apiFetch("/.netlify/functions/api-giver-retry-post", {
    method: "POST",
    body: {exchangeId, participants, assignments},
    onSuccess: (data) => {
      removeFailedEmails();
      if (data.emailsFailed && data.emailsFailed.length > 0) {
        retryCount++;
        showFailedEmails(data.emailsFailed, {exchangeId, participants, assignments}, {onBack});
      } else {
        completeExchange("success");
      }
    },
    onError: () => {
      removeFailedEmails();
      completeExchange("error");
    },
    fallbackMessage: "Retry failed.",
  });
}
