import {selectElement} from "../../utils.js";
import {Events, stateEvents} from "../../events.js";

const controlStripId = "control-strip";

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    render();
  });
}

function template() {
  return `
    <div id="${controlStripId}">
      <div id="btn-div">
        <div data-slot="generate"></div>
        <div data-slot="addHouse"></div>
        <div data-slot="nextStep"></div>
      </div>
    </div>
  `;
}

function render() {
  if (selectElement(`#${controlStripId}`)) return;
  const container = selectElement("#container");
  if (!container) return;
  container.insertAdjacentHTML("beforebegin", template());
}
