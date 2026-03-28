import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {init, tableStyles} from "../../../src/exchange/components/ResultsTable";
import {initReactiveSystem, installParticipantNames, resetDOM, resetState} from "../../specHelper";
import {assignRecipients, startExchange, getState} from "../../../src/exchange/state";
import * as stateModule from "../../../src/exchange/state";

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

  it('renders empty table body', () => {
    startExchange(false);

    const tableBody = document.querySelector("#table-body");
    expect(tableBody).not.toBeNull();
    expect(tableBody.children.length).toBe(0);
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

  it('renders results from getState().assignments when assignRecipients is called', () => {
    startExchange(false);
    installParticipantNames("Alex", "Whitney", "Hunter");

    assignRecipients(["Whitney", "Hunter", "Alex"]);

    const tableBody = document.querySelector('#table-body');
    const rows = tableBody.querySelectorAll(`.${tableStyles.resultRow}`);

    expect(rows.length).toBe(3);

    expect(rows[0].firstElementChild.textContent).toBe('Alex');
    expect(rows[0].lastElementChild.textContent).toBe('Whitney');

    expect(rows[1].firstElementChild.textContent).toBe('Whitney');
    expect(rows[1].lastElementChild.textContent).toBe('Hunter');

    expect(rows[2].firstElementChild.textContent).toBe('Hunter');
    expect(rows[2].lastElementChild.textContent).toBe('Alex');
  });

  it('does not render results when isSecretSanta=true', () => {
    startExchange(true);
    installParticipantNames("Alex", "Whitney");

    assignRecipients(["Whitney", "Alex"]);

    const tableBody = document.querySelector('#table-body');
    expect(tableBody).toBeNull();
  });

  it('applies stagger animation-delay to result rows', () => {
    startExchange(false);
    installParticipantNames("Alex", "Whitney", "Hunter");

    assignRecipients(["Whitney", "Hunter", "Alex"]);

    const rows = document.querySelectorAll(`.${tableStyles.resultRow}`);
    expect(rows[0].style.animationDelay).toBe('');
    expect(rows[1].style.animationDelay).toBe('0.07s');
    expect(rows[2].style.animationDelay).toBe('0.14s');
  });

  it('renders "Email Results" button after recipients assigned', () => {
    startExchange(false);
    installParticipantNames("Alex", "Whitney");
    assignRecipients(["Whitney", "Alex"]);

    const btn = document.querySelector("#email-results-btn");
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe("Email Results");
  });

  it('does not render "Email Results" button in secret santa mode', () => {
    startExchange(true);
    installParticipantNames("Alex", "Whitney");
    assignRecipients(["Whitney", "Alex"]);

    expect(document.querySelector("#email-results-btn")).toBeNull();
  });

  it('"Email Results" button calls requestEmailResults', () => {
    const spy = vi.spyOn(stateModule, "requestEmailResults").mockImplementation(() => {});
    startExchange(false);
    installParticipantNames("Alex", "Whitney");
    assignRecipients(["Whitney", "Alex"]);

    document.querySelector("#email-results-btn").click();

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
