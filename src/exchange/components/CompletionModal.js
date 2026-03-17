import {addEventListener, pushHTML, selectElement} from "../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import {resultsTableHtml} from "./EmailTable/SendResults.js";

const modalId = "completionModal";
const newExchangeBtnId = "newExchangeBtn";
const bmcContainerId = "bmc-button-container";

function messageForMode(mode) {
  if (mode === "error") {
    return `<p>We were unable to send the remaining emails. Please contact these participants directly.</p>`;
  }
  return `<p>Thanks for using Gift Exchange Generator!</p>`;
}

function template({mode, assignments}) {
  let html = `<div id="${modalId}" class="sendEmails show">`;
  if (mode === "results") {
    html += resultsTableHtml({assignments});
  }
  html += messageForMode(mode);
  html += `<div id="${bmcContainerId}"></div>`;
  html += `<button class="button" id="${newExchangeBtnId}">Start New Exchange</button>`;
  html += `</div>`;
  return html;
}

function injectBmcButton() {
  const container = selectElement(`#${bmcContainerId}`);
  if (!container) return;
  const script = document.createElement("script");
  script.src = "https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js";
  script.setAttribute("data-name", "bmc-button");
  script.setAttribute("data-slug", "arootroatch");
  script.setAttribute("data-color", "#69292a");
  script.setAttribute("data-emoji", "");
  script.setAttribute("data-font", "Arial");
  script.setAttribute("data-text", "Buy me a coffee");
  script.setAttribute("data-outline-color", "#ffffff");
  script.setAttribute("data-font-color", "#ffffff");
  script.setAttribute("data-coffee-color", "#FFDD00");
  container.appendChild(script);
}

function render(state) {
  selectElement(`#${modalId}`)?.remove();
  pushHTML("body", template(state));
  addEventListener(`#${newExchangeBtnId}`, "click", () => {
    location.reload();
  });
  injectBmcButton();
}

function remove() {
  selectElement(`#${modalId}`)?.remove();
}

export function init() {
  stateEvents.on(Events.EXCHANGE_COMPLETE, render);
  stateEvents.on(Events.EXCHANGE_STARTED, remove);
}
