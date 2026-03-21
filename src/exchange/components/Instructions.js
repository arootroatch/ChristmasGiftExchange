import {ExchangeEvents as Events, exchangeEvents as stateEvents, startExchange} from "../state.js";
import {leftContainerId, selectElement} from "../../utils.js";
import {introTemplate, introId} from "../firstScreenTemplates.js";

export function secretSantaMode() {
  selectElement(`#${leftContainerId}`).classList.add("secret");
  startExchange(true);
}

function attachButtonHandlers() {
  const letsGo = selectElement("#letsGo");
  const secretSantaBtn = selectElement("#secretSantaBtn");
  if (letsGo) letsGo.onclick = () => startExchange(false);
  if (secretSantaBtn) secretSantaBtn.onclick = secretSantaMode;
}

function onExchangeStarted({isSecretSanta, isReuse}) {
  if (isReuse && isSecretSanta) {
    selectElement(`#${leftContainerId}`).classList.add("secret");
  }
  const slot = selectElement('[data-slot="instructions"]');
  if (slot) slot.innerHTML = "";
}

export function render() {
  const slot = selectElement('[data-slot="instructions"]');
  if (slot) {
    slot.innerHTML = introTemplate();
    attachButtonHandlers();
  }
}

export function init() {
  render();
  stateEvents.on(Events.EXCHANGE_STARTED, onExchangeStarted);
}
