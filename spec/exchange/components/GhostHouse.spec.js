import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  addHouseToDOM,
  enterName,
  initReactiveSystem,
  installParticipantNames,
  removeAllHouses,
  removeAllNames,
  resetDOM,
  resetState,
} from "../../specHelper";
import {init as initGhostHouse} from "../../../src/exchange/components/GhostHouse";
import {
  addParticipant,
  assignRecipients,
  getState,
  loadExchange,
  removeParticipant,
} from "../../../src/exchange/state";
import {selectElement} from "../../../src/utils";
import * as stateModule from "../../../src/exchange/state";

describe("GhostHouse", () => {
  beforeAll(() => {
    initReactiveSystem();
    initGhostHouse();
  });

  beforeEach(() => {
    resetDOM();
    resetState();
    removeAllNames();
    removeAllHouses();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("appearance", () => {
    it("does not appear before 3 participants", () => {
      addParticipant("Alex");
      addParticipant("Whitney");
      expect(selectElement("#ghost-house")).toBeNull();
    });

    it("appears after 3rd participant is added", () => {
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      expect(selectElement("#ghost-house")).not.toBeNull();
    });

    it("shows instructional text in initial state", () => {
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      const ghost = selectElement("#ghost-house");
      expect(ghost.textContent).toContain("prevent certain people");
    });

    it("shows Add Group button in initial state", () => {
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      expect(selectElement("#ghost-house .ghost-house-btn")).not.toBeNull();
    });

    it("stays visible when participant count drops below 3", () => {
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      expect(selectElement("#ghost-house")).not.toBeNull();
      removeParticipant("Carol");
      expect(selectElement("#ghost-house")).not.toBeNull();
    });
  });

  describe("button click", () => {
    it("calls addHouseToState when button is clicked", () => {
      const spy = vi.spyOn(stateModule, "addHouseToState");
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      selectElement("#ghost-house .ghost-house-btn").click();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("minimal state", () => {
    it("transitions to minimal state after first group created", () => {
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      addHouseToDOM();
      const ghost = selectElement("#ghost-house");
      expect(ghost.textContent).not.toContain("prevent certain people");
      expect(ghost.textContent).toContain("Add another group");
    });

    it("reverts to initial state when all groups removed", () => {
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      addHouseToDOM();
      selectElement("#house-0-delete").click();
      const ghost = selectElement("#ghost-house");
      expect(ghost.textContent).toContain("prevent certain people");
    });
  });

  describe("removal", () => {
    it("is removed in secret santa mode after generation", () => {
      getState().isSecretSanta = true;
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      expect(selectElement("#ghost-house")).not.toBeNull();
      installParticipantNames("Dave");
      assignRecipients(["Whitney", "Carol", "Dave", "Alex"]);
      expect(selectElement("#ghost-house")).toBeNull();
    });

    it("persists in normal mode after generation", () => {
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      installParticipantNames("Dave");
      assignRecipients(["Whitney", "Carol", "Dave", "Alex"]);
      expect(selectElement("#ghost-house")).not.toBeNull();
    });
  });

  describe("Shift+Enter keybinding", () => {
    function dispatchShiftEnter() {
      window.dispatchEvent(new KeyboardEvent("keyup", {
        shiftKey: true, keyCode: 13, bubbles: true, cancelable: true
      }));
    }

    it("triggers addHouseToState when ghost house is rendered", () => {
      const spy = vi.spyOn(stateModule, "addHouseToState");
      addParticipant("Alex");
      addParticipant("Whitney");
      addParticipant("Carol");
      dispatchShiftEnter();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not trigger before ghost house appears", () => {
      const spy = vi.spyOn(stateModule, "addHouseToState");
      addParticipant("Alex");
      dispatchShiftEnter();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("reuse exchange", () => {
    const exchangeData = {
      isSecretSanta: false,
      houses: [{name: "Group 1", members: ["Alex"]}],
      participants: [
        {name: "Alex", email: "alex@test.com"},
        {name: "Whitney", email: "w@test.com"},
        {name: "Carol", email: "c@test.com"},
      ]
    };

    it("appears in minimal state immediately on reuse", () => {
      loadExchange(exchangeData);
      const ghost = selectElement("#ghost-house");
      expect(ghost).not.toBeNull();
      expect(ghost.textContent).toContain("Add another group");
      expect(ghost.textContent).not.toContain("prevent certain people");
    });
  });
});
