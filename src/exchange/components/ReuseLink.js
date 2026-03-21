import {selectElement} from "../../utils";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";
import {reuseLinkTemplate} from "../firstScreenTemplates.js";

export function init() {
    selectElement('[data-slot="reuse-link"]').innerHTML = reuseLinkTemplate();
    stateEvents.on(Events.EXCHANGE_STARTED, () => {
        selectElement('[data-slot="reuse-link"]').innerHTML = "";
    });
}
