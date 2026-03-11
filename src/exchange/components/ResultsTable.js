import {pushHTML, selectElement} from "../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents} from "../state.js";

const tableId = "results-table";
const tableBodyId = "table-body";
const flexDivSelector = "#flex-div";

function template() {
  return `<div class="results-card" id="${tableId}">
    <h2>Results</h2>
    <div class="results-header">
      <span>Giver</span>
      <span></span>
      <span>Recipient</span>
    </div>
    <div id="${tableBodyId}"></div>
  </div>`;
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
    html += `<div class="result-row">
                <span>${assignment.giver}</span>
                <span class="result-arrow">&#8594;</span>
                <span>${assignment.recipient}</span>
            </div>`;
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
