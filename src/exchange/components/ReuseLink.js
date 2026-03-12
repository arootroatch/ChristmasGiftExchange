import {selectElement} from "../../utils";

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
}
