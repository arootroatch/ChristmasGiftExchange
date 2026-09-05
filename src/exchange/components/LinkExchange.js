import {ExchangeEvents as Events, exchangeEvents as stateEvents, getExchangePayload, completeExchange} from "../state.js";
import {selectElement, pushHTML, addEventListener, apiFetch, setLoadingState, clearLoadingState} from "../../utils.js";
import {showError} from "../../Snackbar.js";
import {authGateTemplate, initAuthGate} from "../../authGate.js";
import {getSessionUser} from "../../session.js";
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
import confirmStyles from '../../../assets/styles/exchange/components/email-confirmation.module.css';

const containerId = "linkExchangeContainer";
let isSaving = false;

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
  isSaving = false;
  pushHTML("body", promptTemplate());
  addEventListener("#linkSaveNoBtn", "click", handleNoThanksClick);
  addEventListener("#linkSaveYesBtn", "click", handleYesClick);
}

function setSaveButtonsLoading() {
  if (selectElement("#linkSaveNoBtn")) setLoadingState("#linkSaveNoBtn");
  if (selectElement("#linkSaveYesBtn")) setLoadingState("#linkSaveYesBtn");
}

function clearSaveButtonsLoading() {
  if (selectElement("#linkSaveNoBtn")) clearLoadingState("#linkSaveNoBtn");
  if (selectElement("#linkSaveYesBtn")) clearLoadingState("#linkSaveYesBtn");
}

function handleNoThanksClick() {
  if (isSaving) return;
  isSaving = true;
  setSaveButtonsLoading();
  createLinkExchange();
}

function handleYesClick() {
  if (isSaving) return;
  isSaving = true;
  setSaveButtonsLoading();
  if (getSessionUser()) {
    createLinkExchange();
  } else {
    showVerifyStep();
  }
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
    onError: (msg) => {
      isSaving = false;
      clearSaveButtonsLoading();
      showError(msg);
    },
    fallbackMessage: "Failed to create link. Please try again.",
  });
}
