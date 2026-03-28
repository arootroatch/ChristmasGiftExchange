import {addEventListener, pushHTML, selectElement} from "../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import {resultsTableHtml} from "./EmailTable/SendResults.js";
import {isBmcConsented} from "../../CookieBanner.js";
import btnStyles from '../../../assets/styles/exchange/components/buttons.module.css';

const modalId = "completionModal";
const newExchangeBtnId = "newExchangeBtn";
const bmcContainerId = "bmc-button-container";
const bmcImageUrl = "https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=arootroatch&button_colour=69292a&font_colour=ffffff&font_family=Arial&outline_colour=ffffff&coffee_colour=FFDD00";

function messageForMode(mode) {
  if (mode === "error") {
    return `<p>We were unable to send the remaining emails. Please contact these participants directly.</p>`;
  }
  if (mode === "success") {
    return `<p>Your exchange has been saved and emails have been sent. Thanks for using Gift Exchange Generator!</p>`;
  }
  return `<p>Thanks for using Gift Exchange Generator!</p>`;
}

function bmcButtonHtml() {
  const hint = isBmcConsented()
    ? `<p class="bmc-hint">Or click the coffee cup in the bottom right to contribute without leaving the page.</p>`
    : "";
  return `<div id="${bmcContainerId}"><p>Love the site? Become a supporter! No account necessary.</p><a href="https://buymeacoffee.com/arootroatch" target="_blank"><img src="${bmcImageUrl}" alt="Buy Me A Coffee" style="height:60px;width:217px;"></a>${hint}</div>`;
}

function template({mode, assignments}) {
  let html = `<div id="${modalId}" class="sendEmails show">`;
  if (mode === "results") {
    html += resultsTableHtml({assignments});
  }
  html += messageForMode(mode);
  html += bmcButtonHtml();
  html += `<button class="${btnStyles.button}" id="${newExchangeBtnId}">Start New Exchange</button>`;
  html += `</div>`;
  return html;
}

function render(state) {
  selectElement(`#${modalId}`)?.remove();
  pushHTML("body", template(state));
  addEventListener(`#${newExchangeBtnId}`, "click", () => {
    location.reload();
  });
}

function remove() {
  selectElement(`#${modalId}`)?.remove();
}

export function init() {
  stateEvents.on(Events.EXCHANGE_COMPLETE, render);
  stateEvents.on(Events.EXCHANGE_STARTED, remove);
}
