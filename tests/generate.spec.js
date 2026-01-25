import {beforeEach, describe, expect, it, vi} from 'vitest';
import * as generateModule from '../resources/js/generate';
import {
  clearGeneratedListTable,
  deepCopy,
  emptyTable,
  fillHouses,
  generateList,
  hasDuplicates
} from '../resources/js/generate';
import state from '../resources/js/state';
import {
  addHouseToDOM,
  enterName,
  moveNameToHouse,
  removeAllHouses,
  removeAllNames,
  resetState, shouldDisplayEmailTable,
  shouldDisplayErrorSnackbar, shouldNotDisplay, shouldNotSelect
} from "./specHelper";
import '../resources/js/components/name';

describe('generate', () => {
  beforeEach(resetState);

  describe('emptyTable', () => {
    it('returns HTML string with 4 empty table rows', () => {
      const result = emptyTable();

      expect(result).toContain('<tr>');
      expect(result).toContain('<td></td>');
      expect(result.match(/<tr>/g)).toHaveLength(4);
      expect(result.match(/<td><\/td>/g)).toHaveLength(8);
    });
  });

  describe('clearGeneratedListTable', () => {
    beforeEach(() => {
      document.getElementById('table-body').innerHTML = `<tr></tr><tr></tr>`
    });

    it('replaces table content with empty table', () => {
      const tableBody = document.getElementById('table-body');
      expect(tableBody.children.length).toBe(2);

      clearGeneratedListTable();

      expect(tableBody.children.length).toBe(4);
      expect(tableBody.innerHTML).toEqual(emptyTable());
    });
  });

  describe('hasDuplicates', () => {

    it('handles empty array', () => {
      expect(hasDuplicates([])).toBe(false);
    });

    it('handles single house with no duplicates', () => {
      expect(hasDuplicates([['Alice', 'Bob', 'Charlie']])).toBe(false);
    });

    it('handles single house with duplicates', () => {
      expect(hasDuplicates([['Alice', 'Alice', 'Charlie']])).toBe(true);
    });

    it('handles multiple houses with no duplicates', () => {
      expect(hasDuplicates([['Alice', 'Bob', 'Charlie'], ['Joe', "Alex"]])).toBe(false);
    });

    it('handles multiple houses with duplicates', () => {
      expect(hasDuplicates([['Alice', 'Bob', 'Charlie'], ['Alice', "Alex"]])).toBe(true);
    });
  });

  describe('fillHouses', () => {
    beforeEach(() => {
      resetState();
      removeAllNames();
      removeAllHouses();
    })

    it('extracts names from households into state.houses', () => {
      enterName("Alice");
      enterName("Bob");
      enterName("Charlie");
      addHouseToDOM();
      moveNameToHouse("#select-0", "Alice")
      moveNameToHouse("#select-0", "Bob")

      fillHouses();

      expect(state.houses).toContainEqual(['Alice', 'Bob']);
      expect(state.houses).toContainEqual(['Charlie']);
    });

    it('skips empty households', () => {
      enterName("Alice");
      addHouseToDOM();

      fillHouses();

      expect(state.houses.length).toBe(1);
      expect(state.houses).toContainEqual(['Alice']);
    });
  });

  describe('deepCopy', () => {
    it('creates deep copy of array', () => {
      const original = [['Alice', 'Bob'], ['Charlie'], ['David', 'Eve']];
      const result = deepCopy(original);

      expect(result).toEqual(original);
      expect(result).not.toBe(original);
      expect(result[0]).not.toBe(original[0]);
    });

    it('handles empty array', () => {
      const result = deepCopy([]);

      expect(result).toEqual([]);
    });

    it('modifications to copy do not affect original', () => {
      const original = [['Alice', 'Bob']];
      const result = deepCopy(original);

      result[0].push('Charlie');

      expect(original[0]).toEqual(['Alice', 'Bob']);
      expect(result[0]).toEqual(['Alice', 'Bob', 'Charlie']);
    });
  });

  describe('generateList', () => {
    beforeEach(() => {
      resetState();
      removeAllNames();
      removeAllHouses();
      clearGeneratedListTable();
    });

    it('invokes generate with counter=0 and default maxAttempts=25', () => {
      enterName("Alex")
      enterName("Whitney")
      const generate = vi.spyOn(generateModule, "generate");

      generateList();

      expect(generate).toHaveBeenCalledWith(0, 25);
    });

    it('shows error snackbar when there are no names', () => {
      generateList();
      shouldDisplayErrorSnackbar("Please enter participants' names.");
    });

    it('shows error snackbar when duplicate names', () => {
      enterName("Alex");
      enterName("Whitney");
      enterName("Whitney");
      generateList();
      shouldDisplayErrorSnackbar("Duplicate name detected! Please delete the duplicate and re-enter it with a last initial or nickname.");
    });

    it('shows error message when maxAttempt number has been reached without generating valid list', () => {
      enterName("Alex");
      enterName("Whitney");
      addHouseToDOM();
      moveNameToHouse("#select-0", "Alex");
      moveNameToHouse("#select-0", "Whitney");
      generateList();
      shouldDisplayErrorSnackbar("No possible combinations! Please try a different configuration/number of names.");
    });

    it('renders results table', () => {
      enterName("Alex");
      enterName("Whitney");

      generateList();
      let tableHTML = '';
      for (const giver of state.givers) {
        tableHTML += `<tr>
                <td>${giver.name}</td>
                <td>${giver.recipient}</td>
            </tr>`;
      }
      const table = document.getElementById("table-body");

      expect(table.innerHTML).toContain(tableHTML);
    });

    it('should display email table instead of results table if secret santa mode', () => {
      state.isSecretSanta = true;
      enterName("Alex");
      enterName("Whitney");

      generateList();
      shouldDisplayEmailTable("Alex", "Whitney");
    });

    it('should hide secretGenerate and nextStep buttons in Secret Santa mode after generating', () => {
      state.isSecretSanta = true;
      enterName("Alex");
      enterName("Whitney");

      generateList();
      shouldNotDisplay("#generate");
      shouldNotDisplay("#nextStep");
    });

  });


});
