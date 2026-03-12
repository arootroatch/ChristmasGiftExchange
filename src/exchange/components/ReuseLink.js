import {selectElement} from "../../utils";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";

function template() {
    return `<div class="reuseLink">
        <label>Been here before?</label>
        <div>
            <a href="/reuse" class="button" style="text-decoration: none; width: auto; white-space: nowrap;">Reuse a Previous Exchange</a>
        </div>
    </div>`;
}

export function init() {
    selectElement('[data-slot="reuse-link"]').innerHTML = template();
    stateEvents.on(Events.EXCHANGE_STARTED, () => {
        selectElement('[data-slot="reuse-link"]').innerHTML = "";
    });
}
