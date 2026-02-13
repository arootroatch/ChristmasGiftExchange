import {beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {generate, hasDuplicates} from '../resources/js/generate';
import {state} from '../resources/js/state';
import {
  giverByName,
  installGiverNames,
  resetState,
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
