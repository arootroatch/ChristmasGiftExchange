import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  addHouseToDOM,
  click,
  enterName,
  initReactiveSystem,
  moveNameToHouse,
  removeAllHouses,
  removeAllNames,
  resetDOM,
  resetState,
  shouldDisplayEmailTable,
  shouldDisplayErrorSnackbar,
  shouldNotSelect
} from "../../../specHelper";
import * as generateButtonModule from "../../../../src/exchange/components/ControlStrip/GenerateButton";
import {init as initControlStrip} from "../../../../src/exchange/components/ControlStrip/ControlStrip";
import {init as initNextStepButton} from "../../../../src/exchange/components/ControlStrip/NextStepButton";
import {init as initGenerateButton, generateList} from "../../../../src/exchange/components/ControlStrip/GenerateButton";
import {init as initResultsTable} from "../../../../src/exchange/components/ResultsTable";
import {init as initEmailTable} from "../../../../src/exchange/components/EmailTable/EmailTable";
import {addParticipant, assignRecipients, getState} from "../../../../src/exchange/state";
import {selectElement} from "../../../../src/utils";

const noPossibleComboError = "No possible combinations! Please try a different configuration/number of names."

describe("generateButton", () => {
  beforeAll(() => {
    initReactiveSystem();
    initControlStrip();
    initNextStepButton();
    initGenerateButton();
    initEmailTable();
  });

  beforeEach(() => {
    resetDOM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is not rendered at step 1", () => {
    resetState();
    expect(selectElement("#generate")).toBeNull();
  });

  it("is not rendered at step 2", () => {
    resetState();
    addParticipant("Alex");
    click("#nextStep"); // step 2
    expect(getState().step).toBe(2);
    expect(selectElement("#generate")).toBeNull();
  });

  it("renders at step 3", () => {
    resetState();
    addParticipant("Alex");
    click("#nextStep"); // step 2
    click("#nextStep"); // step 3
    expect(getState().step).toBe(3);
    expect(selectElement("#generate")).not.toBeNull();
  });

  it("click calls generateList", () => {
    const spy = vi.spyOn(generateButtonModule, "generateList").mockImplementation(() => {});
    resetState();
    addParticipant("Alex");
    click("#nextStep"); // step 2
    click("#nextStep"); // step 3
    click("#generate");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("is removed at step 4", () => {
    resetState();
    addParticipant("Alex");
    click("#nextStep"); // step 2
    click("#nextStep"); // step 3
    assignRecipients(["Whitney"]);
    click("#nextStep"); // step 4
    expect(getState().step).toBe(4);
    expect(selectElement("#generate")).toBeNull();
  });

  describe("Ctrl+Enter keybinding", () => {
    function dispatchCtrlEnter() {
      window.dispatchEvent(new KeyboardEvent("keyup", {
        ctrlKey: true, keyCode: 13, bubbles: true, cancelable: true
      }));
    }

    afterEach(() => {
      resetDOM();
      resetState();
    });

    it("triggers at step 3 (button rendered)", () => {
      const spy = vi.spyOn(generateButtonModule, "generateList").mockImplementation(() => {});
      resetState();
      addParticipant("Alex");
      click("#nextStep"); // step 2
      click("#nextStep"); // step 3
      dispatchCtrlEnter();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not trigger at step 2 (button not rendered)", () => {
      const spy = vi.spyOn(generateButtonModule, "generateList");
      resetState();
      addParticipant("Alex");
      click("#nextStep"); // step 2
      dispatchCtrlEnter();
      expect(spy).not.toHaveBeenCalled();
    });

    it("does not add keybinding on mobile", () => {
      const originalUA = navigator.userAgent;
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)", configurable: true
      });
      const spy = vi.spyOn(generateButtonModule, "generateList").mockImplementation(() => {});
      resetDOM();
      resetState();
      addParticipant("Alex");
      click("#nextStep"); // step 2
      click("#nextStep"); // step 3
      dispatchCtrlEnter();
      expect(spy).not.toHaveBeenCalled();
      Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
    });
  });
});

describe("generateList", () => {
  beforeAll(() => {
    initReactiveSystem();
    initResultsTable();
    initEmailTable();
  });

  beforeEach(() => {
    resetState();
    removeAllNames();
    removeAllHouses();
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
    enterName("Alex");
    enterName("Whitney");
    click("#nextStep"); // step 2
    addHouseToDOM();
    moveNameToHouse("#house-0-select", "Alex");
    moveNameToHouse("#house-0-select", "Whitney");
    click("#nextStep"); // step 3 — generate button renders
    click("#generate");
    shouldDisplayErrorSnackbar(noPossibleComboError);
  });

  it('renders results table', () => {
    enterName("Alex");
    enterName("Whitney");

    generateList();
    let tableHTML = '';
    for (const assignment of getState().assignments) {
      tableHTML += `<tr>
                <td>${assignment.giver}</td>
                <td>${assignment.recipient}</td>
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
    for (const assignment of getState().assignments) {
      tableHTML += `<tr>
                <td>${assignment.giver}</td>
                <td>${assignment.recipient}</td>
            </tr>`;
    }
    const table = document.querySelector("#table-body");

    expect(table.innerHTML).toContain(tableHTML);
  });

  it('should display email table instead of results table if secret santa mode', () => {
    getState().isSecretSanta = true;
    enterName("Alex");
    enterName("Whitney");

    generateList();
    shouldDisplayEmailTable("Alex", "Whitney");
  });

  it('should hide secretGenerate and nextStep buttons in Secret Santa mode after generating', () => {
    getState().isSecretSanta = true;
    enterName("Alex");
    enterName("Whitney");

    generateList();
    shouldNotSelect("#generate");
    shouldNotSelect("#nextStep");
  });

  it('calls assignRecipients when not secret santa', async () => {
    const stateModule = await import('../../../../src/exchange/state.js');
    const spy = vi.spyOn(stateModule, 'assignRecipients');

    enterName("Alex");
    enterName("Whitney");
    generateList();

    expect(spy).toHaveBeenCalledWith(["Whitney", "Alex"]);
    spy.mockRestore();
  });
});
