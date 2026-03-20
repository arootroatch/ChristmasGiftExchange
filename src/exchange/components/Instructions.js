import {ExchangeEvents as Events, exchangeEvents as stateEvents, startExchange} from "../state.js";
import {leftContainerId, selectElement} from "../../utils.js";

const introId = "intro";

function introTemplate() {
  return `<div id="${introId}">
    <p>
      Drawing names for a gift exchange or Secret Santa? Here's a
      web app to make it easier! <br><br>
      Simply:
    </p>
    <ol>
      <li>Add all participant names</li>
      <li>Separate people who live together into Houses (optional)</li>
      <li>Generate the list</li>
      <li>Send everyone an email with the name of their recipient (optional)</li>
    </ol>
    <p>
      To keep the results a secret, click
      "Secret Santa Mode" instead.
    </p>
    <p>
      This site will always be free to use and your information will never be shared.
    </p>
    <div id="get-started">
      <p>Ready to get started?</p>
      <button class="button" id="letsGo" style="margin-bottom: 0;">Let's go!</button>
      <button class="btn-bottom" id="secretSantaBtn">Secret Santa Mode</button>
    </div>
  </div>`;
}

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
