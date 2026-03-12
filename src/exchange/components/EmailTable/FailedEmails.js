import {addEventListener, pushHTML, selectElement, setLoadingState, escapeAttr, apiFetch} from "../../../utils.js";
import {showError, showSuccess} from "../../../Snackbar.js";

const failedEmailsId = "failedEmails";
const retryEmailsBtnId = "retryEmailsBtn";

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
    </div>`;
}

export function showFailedEmails(emailsFailed, payload) {
  const failedAssignments = payload.assignments.filter(a => {
    const participant = payload.participants.find(p => p.name === a.giver);
    return participant && emailsFailed.includes(participant.email);
  });
  const failedParticipants = payload.participants.filter(p =>
    emailsFailed.includes(p.email)
  );

  pushHTML("body", failedEmailsTemplate(emailsFailed));
  addEventListener(`#${retryEmailsBtnId}`, "click", () =>
    retryFailedEmails(failedParticipants, failedAssignments)
  );
}

async function retryFailedEmails(participants, assignments) {
  setLoadingState(`#${retryEmailsBtnId}`);

  await apiFetch("/.netlify/functions/api-giver-notify-post", {
    method: "POST",
    body: {participants, assignments},
    onSuccess: (data) => {
      removeFailedEmails();
      if (data.emailsFailed && data.emailsFailed.length > 0) {
        showFailedEmails(data.emailsFailed, {participants, assignments});
      } else {
        showSuccess("Emails sent successfully!");
      }
    },
    onError: () => {
      removeFailedEmails();
      showError("We're sorry, but we were unable to send the remaining emails. Please contact participants directly.");
    },
    fallbackMessage: "Retry failed.",
  });
}
