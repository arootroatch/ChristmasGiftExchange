import {ExchangeEvents as Events, exchangeEvents as stateEvents, setOrganizer} from "../state.js";
import {getSessionUser} from "../../session.js";
import {removeOrganizerGate, showOrganizerGate} from "./organizerGate.js";

export function init() {
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, (state) => {
    if (state.isSecretSanta && !state.isLinkMode) {
      renderOrSkip();
    }
  });
  stateEvents.on(Events.EMAIL_RESULTS_REQUESTED, () => {
    renderOrSkip();
  });
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    removeOrganizerGate();
  });
}

function renderOrSkip() {
  const user = getSessionUser();
  if (user) {
    setOrganizer();
    return;
  }
  showOrganizerGate({heading: "Who's organizing this exchange?", onSuccess: setOrganizer});
}
