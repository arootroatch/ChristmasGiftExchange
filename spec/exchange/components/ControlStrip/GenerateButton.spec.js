import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  addHouseToDOM,
  click,
  enterName,
  initReactiveSystem,
  installParticipantNames,
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
import {init as initGenerateButton, generateList, getGlowClass} from "../../../../src/exchange/components/ControlStrip/GenerateButton";
import {init as initResultsTable, tableStyles} from "../../../../src/exchange/components/ResultsTable";
import {init as initEmailTable} from "../../../../src/exchange/components/EmailTable/EmailTable";
import {init as initOrganizerForm} from "../../../../src/exchange/components/OrganizerForm";
import {addParticipant, assignRecipients, getState, removeParticipant} from "../../../../src/exchange/state";
import {selectElement} from "../../../../src/utils";
import btnStyles from '../../../../assets/styles/exchange/components/buttons.module.css';

const noPossibleComboError = "No possible combinations! Please try a different configuration/number of names."

describe("getGlowClass", () => {
  it("returns null for count below 3", () => {
    expect(getGlowClass(0)).toBeNull();
    expect(getGlowClass(1)).toBeNull();
    expect(getGlowClass(2)).toBeNull();
  });

  it("returns generate-glow-1 for 3-4 participants", () => {
    expect(getGlowClass(3)).toBe(btnStyles.generateGlow1);
    expect(getGlowClass(4)).toBe(btnStyles.generateGlow1);
  });

  it("returns generate-glow-2 for 5-7 participants", () => {
    expect(getGlowClass(5)).toBe(btnStyles.generateGlow2);
    expect(getGlowClass(7)).toBe(btnStyles.generateGlow2);
  });

  it("returns generate-glow-3 for 8+ participants", () => {
    expect(getGlowClass(8)).toBe(btnStyles.generateGlow3);
    expect(getGlowClass(15)).toBe(btnStyles.generateGlow3);
  });
});

describe("generateButton", () => {
  beforeAll(() => {
    initReactiveSystem();
    initControlStrip();
    initGenerateButton();
    initEmailTable();
  });

  beforeEach(() => {
    resetDOM();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is not rendered before any participants added", () => {
    resetState();
    expect(selectElement("#generate")).toBeNull();
  });

  it("renders after first participant added", () => {
    resetState();
    addParticipant("Alex");
    expect(selectElement("#generate")).not.toBeNull();
  });

  it("click calls generateList", () => {
    const spy = vi.spyOn(generateButtonModule, "generateList").mockImplementation(() => {});
    resetState();
    addParticipant("Alex");
    click("#generate");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("stays rendered after recipients assigned in non-secret-santa mode", () => {
    resetState();
    addParticipant("Alex");
    installParticipantNames("Whitney");
    assignRecipients(["Whitney", "Alex"]);
    expect(selectElement("#generate")).not.toBeNull();
  });

  it("is removed after recipients assigned in secret santa mode", () => {
    resetState();
    getState().isSecretSanta = true;
    addParticipant("Alex");
    installParticipantNames("Whitney");
    assignRecipients(["Whitney", "Alex"]);
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

    it("triggers when button is rendered", () => {
      const spy = vi.spyOn(generateButtonModule, "generateList").mockImplementation(() => {});
      resetState();
      addParticipant("Alex");
      dispatchCtrlEnter();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not trigger before participants added", () => {
      const spy = vi.spyOn(generateButtonModule, "generateList");
      resetState();
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
      dispatchCtrlEnter();
      expect(spy).not.toHaveBeenCalled();
      Object.defineProperty(navigator, "userAgent", { value: originalUA, configurable: true });
    });
  });

  describe("generate hint text", () => {
    it("does not show hint text before 3rd participant", () => {
      resetState();
      addParticipant("Alex");
      addParticipant("Whitney");
      const hint = document.querySelector("#generate-hint");
      expect(hint.textContent).toBe("");
    });

    it("shows hint text after 3rd participant", () => {
      resetState();
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      const hint = document.querySelector("#generate-hint");
      expect(hint.textContent).toContain("When you're ready");
    });

    it("updates hint text after generation in normal mode", () => {
      resetState();
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      installParticipantNames("Dave");
      assignRecipients(["Whitney", "Carol", "Dave", "Alex"]);
      const hint = document.querySelector("#generate-hint");
      expect(hint.textContent).toContain("different combinations");
    });

    it("clears hint text after generation in secret santa mode", () => {
      resetState();
      getState().isSecretSanta = true;
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      installParticipantNames("Dave");
      assignRecipients(["Whitney", "Carol", "Dave", "Alex"]);
      const hint = document.querySelector("#generate-hint");
      expect(hint.textContent).toBe("");
    });

    it("persists hint text when participants removed below 3", () => {
      resetState();
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      expect(document.querySelector("#generate-hint").textContent).toContain("When you're ready");
      removeParticipant("Carol");
      expect(document.querySelector("#generate-hint").textContent).toContain("When you're ready");
    });
  });

  describe("progressive glow", () => {
    it("applies generate-glow-1 after 3rd participant", () => {
      resetState();
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      const btn = selectElement("#generate");
      expect(btn.classList.contains(btnStyles.generateGlow1)).toBe(true);
    });

    it("applies generate-glow-2 after 5th participant", () => {
      resetState();
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      addParticipant("Dave");
      addParticipant("Eve");
      const btn = selectElement("#generate");
      expect(btn.classList.contains(btnStyles.generateGlow2)).toBe(true);
      expect(btn.classList.contains(btnStyles.generateGlow1)).toBe(false);
    });

    it("applies generate-glow-3 after 8th participant", () => {
      resetState();
      for (const name of ["A", "B", "C", "D", "E", "F", "G", "H"]) {
        addParticipant(name);
      }
      const btn = selectElement("#generate");
      expect(btn.classList.contains(btnStyles.generateGlow3)).toBe(true);
      expect(btn.classList.contains(btnStyles.generateGlow2)).toBe(false);
    });

    it("resets glow when new exchange started", () => {
      resetState();
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      expect(selectElement("#generate").classList.contains(btnStyles.generateGlow1)).toBe(true);
      resetState();
      addParticipant("Alex");
      expect(selectElement("#generate")).not.toBeNull();
      const btn = selectElement("#generate");
      expect(btn.classList.contains(btnStyles.generateGlow1)).toBe(false);
    });
  });
});

describe("generateList", () => {
  beforeAll(() => {
    initReactiveSystem();
    initResultsTable();
    initOrganizerForm();
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
    const assignments = getState().assignments;
    let tableHTML = '';
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      const delay = i > 0 ? ` style="animation-delay: ${(i * 0.07).toFixed(2)}s"` : '';
      tableHTML += `<div class="${tableStyles.resultRow}"${delay}>
                <span>${assignment.giver}</span>
                <span class="${tableStyles.resultArrow}">→</span>
                <span>${assignment.recipient}</span>
            </div>`;
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
    const assignments = getState().assignments;
    let tableHTML = '';
    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];
      const delay = i > 0 ? ` style="animation-delay: ${(i * 0.07).toFixed(2)}s"` : '';
      tableHTML += `<div class="${tableStyles.resultRow}"${delay}>
                <span>${assignment.giver}</span>
                <span class="${tableStyles.resultArrow}">→</span>
                <span>${assignment.recipient}</span>
            </div>`;
    }
    const table = document.querySelector("#table-body");

    expect(table.innerHTML).toContain(tableHTML);
  });

  it('should display organizer form instead of results table if secret santa mode', () => {
    getState().isSecretSanta = true;
    enterName("Alex");
    enterName("Whitney");

    generateList();
    expect(document.querySelector("#organizerFormContainer")).not.toBeNull();
    expect(document.querySelector("#emailTable")).toBeNull();
  });

  it('should hide generate button in Secret Santa mode after generating', () => {
    getState().isSecretSanta = true;
    enterName("Alex");
    enterName("Whitney");

    generateList();
    shouldNotSelect("#generate");
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
