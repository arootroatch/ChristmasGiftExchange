import {registerComponent} from "../render.js";
import {selectElement} from "../utils.js";

const tableBodyId = "table-body";

export function init() {
  registerComponent('resultsTable', resultsTableRenderer);
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

export function renderResultsToTable(results) {
  clearGeneratedListTable();
  let html = '';
  for (const giver of results) {
    html += `<tr>
                <td>${giver.name}</td>
                <td>${giver.recipient}</td>
            </tr>`;
  }
  selectElement(`#${tableBodyId}`).insertAdjacentHTML(
    "beforeend",
    html
  );
}

const resultsTableRenderer = {
  onComponentAdded(event) {
  },

  onComponentRemoved(event) {
  },

  onComponentUpdated(event) {
  }
};
