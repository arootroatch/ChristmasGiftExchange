import {addEventListener, pushHTML, selectElement} from "../../utils.js";
import {ExchangeEvents as Events, exchangeEvents as stateEvents, requestEmailResults} from "../state.js";

const tableId = "results-table";
const tableBodyId = "table-body";
const flexDivSelector = "#flex-div";

function template() {
  return `<div class="results-card" id="${tableId}">
    <div class="results-card-header">
      <h2>Results</h2>
      <div id="email-results-slot"></div>
    </div>
    <div class="results-header">
      <span>Giver</span>
      <span></span>
      <span>Recipient</span>
    </div>
    <div id="${tableBodyId}"></div>
  </div>`;
}

function renderEmailResultsButton() {
  const slot = selectElement("#email-results-slot");
  if (!slot) return;
  slot.innerHTML = `<button class="btn-bottom" id="email-results-btn">Email Results</button>`;
  addEventListener("#email-results-btn", "click", requestEmailResults);
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
  for (let i = 0; i < assignments.length; i++) {
    const assignment = assignments[i];
    const delay = i > 0 ? ` style="animation-delay: ${(i * 0.07).toFixed(2)}s"` : '';
    html += `<div class="result-row"${delay}>
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
      renderEmailResultsButton();
    }
  });
}
