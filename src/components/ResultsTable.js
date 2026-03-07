import {pushHTML, selectElement} from "../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../exchange/state.js";

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

function renderResults(assignments) {
  clearTable();
  let html = '';
  for (const assignment of assignments) {
    html += `<tr>
                <td>${assignment.giver}</td>
                <td>${assignment.recipient}</td>
            </tr>`;
  }
  pushHTML(`#${tableBodyId}`, html);
}

export function init() {
  stateEvents.on(Events.EXCHANGE_STARTED, ({isSecretSanta}) => {
    if (isSecretSanta) {
      remove();
    } else {
      render();
    }
  });
  stateEvents.on(Events.RECIPIENTS_ASSIGNED, ({isGenerated, isSecretSanta, assignments}) => {
    if (isGenerated && !isSecretSanta) {
      renderResults(assignments);
    }
  });
}
