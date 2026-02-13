import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {
  clearGeneratedListTable,
  emptyTable,
  init,
} from "../../resources/js/components/resultsTable";
import {initReactiveSystem, installGiverNames, resetState} from "../specHelper";
import {state, assignRecipients} from "../../resources/js/state";

describe('resultsTable', () => {
  beforeAll(() => {
    initReactiveSystem();
    init();
  });

  beforeEach(() => {
    resetState();
    // Clear the table body manually
    const tableBody = document.querySelector('#table-body');
    if (tableBody) {
      while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
      }
    }
  });

  it('component has init function', () => {
    expect(typeof init).toBe('function');
  });

  it('emptyTable returns HTML string with 4 empty table rows', () => {
    const result = emptyTable();

    expect(result).toContain('<tr>');
    expect(result).toContain('<td></td>');
    expect(result.match(/<tr>/g)).toHaveLength(4);
    expect(result.match(/<td><\/td>/g)).toHaveLength(8);
  });

  it('clearGeneratedListTable clears table content', () => {
    const tableBody = document.querySelector('#table-body');
    tableBody.innerHTML = '<tr></tr><tr></tr>';

    expect(tableBody.children.length).toBe(2);

    clearGeneratedListTable();

    expect(tableBody.children.length).toBe(0);
  });


  it('renders results from state.givers when assignRecipients is called', () => {
    installGiverNames("Alex", "Whitney", "Hunter");

    assignRecipients(["Whitney", "Hunter", "Alex"]);

    const tableBody = document.querySelector('#table-body');
    const rows = tableBody.querySelectorAll('tr');

    expect(rows.length).toBe(3);

    expect(tableBody.innerHTML).toContain('<td>Alex</td>');
    expect(tableBody.innerHTML).toContain('<td>Whitney</td>');
    expect(tableBody.innerHTML).toContain('<td>Hunter</td>');

    const row1Cells = rows[0].querySelectorAll('td');
    expect(row1Cells[0].textContent).toBe('Alex');
    expect(row1Cells[1].textContent).toBe('Whitney');

    const row2Cells = rows[1].querySelectorAll('td');
    expect(row2Cells[0].textContent).toBe('Whitney');
    expect(row2Cells[1].textContent).toBe('Hunter');

    const row3Cells = rows[2].querySelectorAll('td');
    expect(row3Cells[0].textContent).toBe('Hunter');
    expect(row3Cells[1].textContent).toBe('Alex');
  });

  it('does not render results when isSecretSanta=true', () => {
    installGiverNames("Alex", "Whitney");
    state.isSecretSanta = true;

    assignRecipients(["Whitney", "Alex"]);

    const tableBody = document.querySelector('#table-body');
    expect(tableBody.children.length).toBe(0);
  });
});
