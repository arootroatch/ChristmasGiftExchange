import {selectElement} from "../../utils";

function template() {
    return `<div class="emailQuery" style="text-align: center; margin-top: 10px;">
        <label>Been here before?</label>
        <div style="margin: 10px 0; display: block;">
            <a href="/reuse/" class="button" style="text-decoration: none; width: auto; white-space: nowrap;">Reuse a Previous Exchange</a>
        </div>
    </div>`;
}

export function init() {
    selectElement('[data-slot="reuse-link"]').innerHTML = template();
}
