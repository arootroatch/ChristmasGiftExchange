import * as navbar from "../../Navbar.js";
import {selectElement} from "../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";

export function init() {
  navbar.init();

  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    const title = selectElement('#exchange-title');
    if (title) title.hidden = true;
  });
}
