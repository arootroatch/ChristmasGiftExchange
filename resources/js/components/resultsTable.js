import {registerComponent} from "../render.js";
import {selectElement, pushHTML} from "../utils.js";
import state from "../state.js";

const tableBodyId = "table-body";

export function init() {
  registerComponent('resultsTable', resultsTableRenderer);
}

const resultsTableRenderer = {
  onComponentAdded(event) {
  },

  onComponentRemoved(event) {
  },

  onComponentUpdated(event) {
    if (event.type === 'resultsTable' && event.data?.isGenerated === true && event.data?.isSecretSanta === false) {
      renderResultsToTable(event.data.givers);
    }
  }
};

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

