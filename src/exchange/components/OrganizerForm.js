import {ExchangeEvents as Events, exchangeEvents as stateEvents, setOrganizer} from "../state.js";
import {selectElement} from "../../utils.js";
import {showError} from "../../Snackbar.js";
import {authGateTemplate, initAuthGate} from "../../authGate.js";
import {getSessionUser} from "../../session.js";
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';
import dialogStyles from '../../../assets/styles/exchange/components/email-dialog.module.css';

const containerId = "organizerFormContainer";

export function init() {
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, (state) => {
    if (state.isSecretSanta) {
      renderOrSkip();
    }
  });
  stateEvents.on(Events.EMAIL_RESULTS_REQUESTED, () => {
    renderOrSkip();
  });
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    selectElement(`#${containerId}`)?.remove();
  });
}

function renderOrSkip() {
  const user = getSessionUser();
  if (user) {
    setOrganizer();
    return;
  }
  render();
}

function render() {
  selectElement(`#${containerId}`)?.remove();
  const html = `<div id="${containerId}" class="${dialogStyles.organizerFormContainer} show">${authGateTemplate({heading: "Who's organizing this exchange?", showName: true, buttonClass: btnStyles.button})}</div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  initAuthGate({
    onSuccess: ({email, name}) => {
      selectElement(`#${containerId}`)?.remove();
      setOrganizer();
    },
    onError: (msg) => showError(msg),
    showName: true,
  });
}
