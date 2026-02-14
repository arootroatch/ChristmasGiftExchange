import {pushHTML, selectElement} from "../utils.js";
import {Events, stateEvents} from "../Events.js";
import {state} from "../state.js";

const tableBodyId = "table-body";

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    const table = selectElement('#results-table');
    if (!table) return;
    table.style.display = state.isSecretSanta ? "none" : "table";
  });
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isGenerated, isSecretSanta, givers}) => {
    if (isGenerated && !isSecretSanta) {
      renderResultsToTable(givers);
    }
  });
}

export function emptyTable() {
  return `
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td></td>
      <td></td>
    </tr>
    <tr>
      <td></td>
      <td></td>
    </tr>`

}

export function clearGeneratedListTable() {
  let parentNode = selectElement(`#${tableBodyId}`);
  while (parentNode?.firstChild) {
    parentNode.removeChild(parentNode.firstChild);
  }
}

function renderResultsToTable(results) {
  clearGeneratedListTable();
  let html = '';
  for (const giver of results) {
    html += `<tr>
                <td>${giver.name}</td>
                <td>${giver.recipient}</td>
            </tr>`;
  }
  pushHTML(`#${tableBodyId}`, html);
}
