import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {init} from "../../src/components/ResultsTable";
import {initReactiveSystem, installGiverNames, resetDOM, resetState} from "../specHelper";
import {assignRecipients, startExchange, state} from "../../src/state";

describe('resultsTable', () => {
  beforeAll(() => {
    initReactiveSystem();
    init();
  });

  beforeEach(() => {
    resetDOM();
    resetState();
  });

  it('component has init function', () => {
    expect(typeof init).toBe('function');
  });

  it('renders table into #flex-div on non-secret-santa exchange', () => {
    startExchange(false);

    const table = document.querySelector("#results-table");
    expect(table).not.toBeNull();
    expect(table.closest("#flex-div")).not.toBeNull();
  });

  it('renders empty placeholder rows in tbody', () => {
    startExchange(false);

    const rows = document.querySelectorAll("#table-body tr");
    expect(rows.length).toBe(4);
    rows.forEach(row => {
      const cells = row.querySelectorAll("td");
      expect(cells.length).toBe(2);
      cells.forEach(cell => expect(cell.textContent).toBe(""));
    });
  });

  it('does not render table on secret santa exchange', () => {
    startExchange(true);

    const table = document.querySelector("#results-table");
    expect(table).toBeNull();
  });

  it('removes table when switching to secret santa', () => {
    startExchange(false);
    expect(document.querySelector("#results-table")).not.toBeNull();

    startExchange(true);
    expect(document.querySelector("#results-table")).toBeNull();
  });

  it('renders results from state.givers when assignRecipients is called', () => {
    startExchange(false);
    installGiverNames("Alex", "Whitney", "Hunter");

    assignRecipients(["Whitney", "Hunter", "Alex"]);

    const tableBody = document.querySelector('#table-body');
    const rows = tableBody.querySelectorAll('tr');

    expect(rows.length).toBe(3);

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
    startExchange(true);
    installGiverNames("Alex", "Whitney");

    assignRecipients(["Whitney", "Alex"]);

    const tableBody = document.querySelector('#table-body');
    expect(tableBody).toBeNull();
  });
});
