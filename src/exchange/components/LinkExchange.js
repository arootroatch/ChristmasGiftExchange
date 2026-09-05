import {ExchangeEvents as Events, exchangeEvents as stateEvents, getExchangePayload, completeExchange} from "../state.js";
import {selectElement, pushHTML, addEventListener, apiFetch} from "../../utils.js";
import {showError} from "../../Snackbar.js";
import {authGateTemplate, initAuthGate} from "../../authGate.js";
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
import confirmStyles from '../../../assets/styles/exchange/components/email-confirmation.module.css';

const containerId = "linkExchangeContainer";

export function init() {
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, (state) => {
    if (state.isLinkMode) render();
  });
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    selectElement(`#${containerId}`)?.remove();
  });
}

function promptTemplate() {
  return `<div id="${containerId}" class="${confirmStyles.sendEmails} show">
    <p>Save this exchange for reuse next year? (optional)</p>
    <div>
      <button class="${btnStyles.button}" id="linkSaveYesBtn">Yes, save it</button>
      <button class="${btnStyles.button}" id="linkSaveNoBtn">No thanks</button>
    </div>
  </div>`;
}

function render() {
  selectElement(`#${containerId}`)?.remove();
  pushHTML("body", promptTemplate());
  addEventListener("#linkSaveNoBtn", "click", createLinkExchange);
  addEventListener("#linkSaveYesBtn", "click", showVerifyStep);
}

function showVerifyStep() {
  const container = selectElement(`#${containerId}`);
  container.innerHTML = authGateTemplate({heading: "Verify your email to save this exchange", showName: true, buttonClass: btnStyles.button});
  initAuthGate({
    onSuccess: () => createLinkExchange(),
    onError: (msg) => showError(msg),
    showName: true,
  });
}

function buildPayload() {
  const {exchangeId, houses, assignments} = getExchangePayload();
  return {
    exchangeId,
    houses: houses.map(h => ({name: h.name, members: h.members})),
    participants: assignments.map(a => ({name: a.giver, recipient: a.recipient})),
  };
}

async function createLinkExchange() {
  await apiFetch("/.netlify/functions/api-link-exchange-post", {
    method: "POST",
    body: buildPayload(),
    onSuccess: () => {
      selectElement(`#${containerId}`)?.remove();
      completeExchange("link");
    },
    onError: (msg) => showError(msg),
    fallbackMessage: "Failed to create link. Please try again.",
  });
}
