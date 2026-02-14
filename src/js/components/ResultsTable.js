import {pushHTML, selectElement} from "../utils.js";
import {Events, stateEvents} from "../Events.js";
import {state} from "../state.js";

const tableId = "results-table";
const tableBodyId = "table-body";
const flexDivSelector = "#flex-div";

function template() {
  return `<table class="table" id="${tableId}">
    <thead>
      <tr>
        <th>Giver</th>
        <th>Recipient</th>
      </tr>
    </thead>
    <tbody id="${tableBodyId}">
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
      <tr><td></td><td></td></tr>
    </tbody>
  </table>`;
}

function render() {
  remove();
  pushHTML(flexDivSelector, template());
}

function remove() {
  selectElement(`#${tableId}`)?.remove();
}

function clearTable() {
  const tbody = selectElement(`#${tableBodyId}`);
  while (tbody?.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }
}

function renderResults(results) {
  clearTable();
  let html = '';
  for (const giver of results) {
    html += `<tr>
                <td>${giver.name}</td>
                <td>${giver.recipient}</td>
            </tr>`;
  }
  pushHTML(`#${tableBodyId}`, html);
}

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, () => {
    if (state.isSecretSanta) {
      remove();
    } else {
      render();
    }
  });
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isGenerated, isSecretSanta, givers}) => {
    if (isGenerated && !isSecretSanta) {
      renderResults(givers);
    }
  });
}
