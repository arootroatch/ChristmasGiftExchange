import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import * as generateModule from '../resources/js/generate';
import {
  generate,
  generateList,
  hasDuplicates,
  initEventListeners
} from '../resources/js/generate';
import {
  clearGeneratedListTable,
  init as initResultsTable
} from '../resources/js/components/resultsTable';
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
  shouldNotDisplay,
  initReactiveSystem
} from "./specHelper";

const noPossibleComboError = "No possible combinations! Please try a different configuration/number of names."

describe('generate', () => {

  beforeAll(()=> {
    initReactiveSystem();
  });
  beforeEach(resetState);

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


  describe('generateList', () => {
    beforeEach(() => {
      resetState();
      removeAllNames();
      removeAllHouses();
      clearGeneratedListTable();
      initResultsTable();
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

    it('calls assignRecipients when not secret santa', async () => {
      const stateModule = await import('../resources/js/state.js');
      const spy = vi.spyOn(stateModule, 'assignRecipients');

      enterName("Alex");
      enterName("Whitney");
      generateList();

      expect(spy).toHaveBeenCalledWith(["Whitney", "Alex"]);
      spy.mockRestore();
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
      const alexIndex = state.givers.indexOf(giverByName("Alex"));
      const whitIndex = state.givers.indexOf(giverByName("Whitney"));
      state.houses = {"house-0": ["Alex"], "house-1": ["Whitney"]}
      const {assignments, error} = generate(0, 25);
      expect(assignments[alexIndex]).toEqual("Whitney");
      expect(assignments[whitIndex]).toEqual("Alex");
      expect(error).toBeNull;
    })

    it('three names in the same house, one name in participant list', () => {
      installGiverNames("Alex", "Whitney", "Derek", "Elena");
      state.houses = {"house-0": ["Alex", "Whitney", "Derek"]}
      const results = generate(0, 25);
      expect(results).toStrictEqual({error: noPossibleComboError});
    })
  })

});
