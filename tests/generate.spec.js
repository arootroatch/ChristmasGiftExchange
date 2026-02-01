import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import * as generateModule from '../resources/js/generate';
import {
  clearGeneratedListTable,
  deepCopy,
  emptyTable,
  generate,
  generateList,
  hasDuplicates, initEventListeners,
  selectValidHouse
} from '../resources/js/generate';
import state from '../resources/js/state';
import {
  addHouseToDOM, click,
  enterName,
  giverByName,
  installGiverNames,
  moveNameToHouse,
  removeAllHouses,
  removeAllNames,
  resetState,
  shouldDisplayEmailTable,
  shouldDisplayErrorSnackbar,
  shouldNotDisplay
} from "./specHelper";
import * as name from '../resources/js/components/name';
import * as house from "../resources/js/components/house";

const noPossibleComboError = "No possible combinations! Please try a different configuration/number of names."

describe('generate', () => {

  beforeAll(()=> {
    house.initEventListeners();
    name.initEventListeners();
  });
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
      document.querySelector('#table-body').innerHTML = `<tr></tr><tr></tr>`
    });

    it('clears table content', () => {
      const tableBody = document.querySelector('#table-body');
      expect(tableBody.children.length).toBe(2);

      clearGeneratedListTable();

      expect(tableBody.children.length).toBe(0);
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

  describe('deepCopy', () => {
    it('creates deep copy of array', () => {
      const original = [['Alice', 'Bob'], ['Charlie'], ['David', 'Eve']];
      const result = deepCopy(original);

      expect(result).toEqual(original);
      expect(result).not.toBe(original);
      expect(result[0]).not.toBe(original[0]);
    });

    it('two arrays with one name each', () => {
      const original = [['Alice'], ['Charlie']];
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
      moveNameToHouse("#house-0-select", "Alex");
      moveNameToHouse("#house-0-select", "Whitney");
      generateList();
      shouldDisplayErrorSnackbar(noPossibleComboError);
    });

    it('works properly with event listener', () => {
      initEventListeners();
      enterName("Alex");
      enterName("Whitney");
      addHouseToDOM();
      moveNameToHouse("#house-0-select", "Alex");
      moveNameToHouse("#house-0-select", "Whitney");
      click("#generate");
      shouldDisplayErrorSnackbar(noPossibleComboError);
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
      const table = document.querySelector("#table-body");

      expect(table.innerHTML).toContain(tableHTML);
    });

    it('one name in house another in participant list', () => {
      enterName("Alex");
      enterName("Whitney");
      addHouseToDOM();
      moveNameToHouse("#house-0-select", "Alex");

      generateList();
      let tableHTML = '';
      for (const giver of state.givers) {
        tableHTML += `<tr>
                <td>${giver.name}</td>
                <td>${giver.recipient}</td>
            </tr>`;
      }
      const table = document.querySelector("#table-body");

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

  describe('generate', () => {
    beforeEach(() => {
      resetState();
    });

    it('should return error if no names', () => {
      expect(generate(0, 25)).toStrictEqual({error: "Please enter participants' names."});
    });

    it('should return error if duplicate names', () => {
      installGiverNames("Alex", "Whitney");
      state.houses = {"house-0": ["Alex"], "house-1": ["Alex"]}
      expect(generate(0, 25)).toStrictEqual({error: "Duplicate name detected! Please delete the duplicate and re-enter it with a last initial or nickname."});
    });

    it('should return error if no possible combinations', () => {
      installGiverNames("Alex", "Whitney");
      state.houses = {"house-0": ["Alex", "Whitney"]}
      expect(generate(0, 25)).toStrictEqual({error: noPossibleComboError});
    });

    it('two names in separate houses', () => {
      installGiverNames("Alex", "Whitney");
      state.houses = {"house-0": ["Alex"], "house-1": ["Whitney"]}
      const results = generate(0, 25);
      expect(giverByName("Alex").recipient).toEqual("Whitney");
      expect(giverByName("Whitney").recipient).toEqual("Alex");
      expect(results).toStrictEqual({
        error: null,
        results: state.givers
      });
    })

    it('three names in the same house, one name in participant list', () => {
      installGiverNames("Alex", "Whitney", "Derek", "Elena");
      state.houses = {"house-0": ["Alex", "Whitney", "Derek"]}
      const results = generate(0, 25);
      expect(results).toStrictEqual({error: noPossibleComboError});
    })
  })

  describe('selectValidHouse', () => {
    it('should only return n house that does not contain giver', () => {
      state.houses = {"house-0": ["Alex", "Whitney"], "house-1": ["Charlie", "Emily"], "house-2": ["Megan", "Hunter"]};
      const result = selectValidHouse(
        [["Alex", "Whitney"], ["Charlie", "Emily"], ["Megan", "Hunter"]],
        {name: "Alex"});

      expect(result.randomHouseIndex).not.toBe(0);
      expect(result.randomHouse).not.toStrictEqual(["Alex", "Whitney"]);
    });

    it('giver is not an available recipient', () => {
      state.houses = {"house-0": ["Alex", "Whitney"], "house-1": ["Charlie", "Emily"], "house-2": ["Megan", "Hunter"]};
      const result = selectValidHouse(
        [["Whitney"], ["Charlie", "Emily"], ["Megan", "Hunter"]],
        {name: "Alex"});

      expect(result.randomHouseIndex).not.toEqual(0);
      expect(result.randomHouse).not.toStrictEqual(["Whitney"]);
    });

    it('givers house is the only available', () => {
      state.houses = {"house-0": ["Alex", "Whitney"], "house-1": ["Charlie", "Emily"], "house-2": ["Megan", "Hunter"]};
      const result = selectValidHouse(
        [["Whitney"]],
        {name: "Alex"});

      expect(result.randomHouseIndex).toEqual(null);
      expect(result.randomHouse).toEqual(null);
    });
  })


});
