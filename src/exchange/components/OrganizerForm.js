import {ExchangeEvents as Events, exchangeEvents as stateEvents, setOrganizer} from "../state.js";
import {selectElement} from "../../utils.js";
import {showError} from "../../Snackbar.js";
import {authGateTemplate, initAuthGate} from "../../authGate.js";

const containerId = "organizerFormContainer";

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

function render() {
  selectElement(`#${containerId}`)?.remove();
  const html = `<div id="${containerId}" class="show">${authGateTemplate({heading: "Who's organizing this exchange?", showName: true})}</div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  initAuthGate({
    onSuccess: ({email, name}) => {
      selectElement(`#${containerId}`)?.remove();
      setOrganizer(name, email);
    },
    onError: (msg) => showError(msg),
    showName: true,
  });
}
