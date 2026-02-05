import {beforeAll, beforeEach, describe, expect, it} from "vitest";
import {init, emptyTable, clearGeneratedListTable, renderResultsToTable} from "../../resources/js/components/resultsTable";
import {initReactiveSystem, resetState} from "../specHelper";

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

  it('renderResultsToTable renders results to table', () => {
    const results = [
      {name: 'Alex', recipient: 'Whitney'},
      {name: 'Whitney', recipient: 'Alex'}
    ];
    
    renderResultsToTable(results);
    
    const tableBody = document.querySelector('#table-body');
    expect(tableBody.innerHTML).toContain('<td>Alex</td>');
    expect(tableBody.innerHTML).toContain('<td>Whitney</td>');
    expect(tableBody.querySelectorAll('tr').length).toBe(2);
  });
});
