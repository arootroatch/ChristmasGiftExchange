import {beforeEach, beforeAll, describe, expect, it, vi} from "vitest";
import {
  addHouseToDOM,
  change,
  clearNameSelects,
  click,
  enterName, moveNameToHouse,
  removeAllNames,
  removeAllHouses,
  resetState,
  shouldSelect,
  stubProperty,
  stubPropertyByID
} from "../specHelper";
import {addEventListener, removeEventListener} from "../../resources/js/utils";
import * as name from "../../resources/js/components/name";
import {addHouse, deleteHouse, initEventListeners, insertNameFromSelect} from "../../resources/js/components/house";
import state, * as stateModule from "../../resources/js/state";

describe('addHouse', () => {
  vi.mock(import("/resources/js/utils.js"), async (importOriginal) => {
    const original = await importOriginal();
    return {
      ...original,
      addEventListener: vi.fn(original.addEventListener),
      removeEventListener: vi.fn(original.removeEventListener),
    };
  });

  beforeAll(initEventListeners);

  beforeEach(() => {
    resetState();
    addHouseToDOM();
  })

  it('should add house to DOM', () => {
    shouldSelect("#house-0-select");
    shouldSelect("#house-0");
    shouldSelect("#house-0-delete");
  });

  it('should add house to state', () => {
    expect(state.houses["house-0"]).toEqual([]);
  });

  it('adds click event listener to delete house button', () => {
    expect(addEventListener).toHaveBeenCalledWith("#house-0-delete", "click", deleteHouse);
  });

  it('adds change event listener to name select', () => {
    expect(addEventListener).toHaveBeenCalledWith("#house-0-select", "change", insertNameFromSelect);
  });
});

describe("deleteHouse", () => {

  beforeAll(name.initEventListeners);
  beforeEach(() => {
    resetState();
    removeAllNames();
    enterName("Alex");
    enterName("Whitney");
    addHouse();
    moveNameToHouse("#house-0-select", "Alex");
    moveNameToHouse("#house-0-select", "Whitney");
  });

  it("puts names back in participants list", () => {
    expect(document.querySelectorAll("#house-0 .name-container .name-wrapper").length).toBe(2);
    click("#house-0-delete")
    const participants = document.querySelector("#participants");
    const participantNames = Array.from(participants.querySelectorAll(".name-wrapper"));
    expect(participantNames.length).toBe(2);
    expect(document.querySelector("#house-0 .name-container .name-wrapper")).toBeNull();
  });

  it("deletes houseDiv", () => {
    const houseDiv = document.querySelector("#house-0");
    const removeSpy = vi.fn();
    stubProperty(houseDiv, "remove", removeSpy)
    click("#house-0-delete");
    expect(removeSpy).toHaveBeenCalled();
  })

  it("removes house from state", () => {
    expect(state.houses["house-0"]).toBeDefined();
    click("#house-0-delete");
    expect(state.houses["house-0"]).toBeUndefined();
  })

  it("removes event listeners for deleteHouse and name select", () => {
    click("#house-0-delete");
    expect(removeEventListener).toHaveBeenCalledWith("#house-0-delete", "click", deleteHouse);
    expect(removeEventListener).toHaveBeenCalledWith("#house-0-select", "change", insertNameFromSelect);

  })
});

describe('insertNameFromSelect', () => {
  let select;

  beforeEach(() => {
    resetState();
    removeAllNames();
    removeAllHouses();
    clearNameSelects();
    enterName("Alex");
    addHouse();
    select = document.querySelector("#house-0-select");
  })

  it('sets select back to default', () => {
    change("#house-0-select", "Alex");
    expect(select.textContent).toContain("-- Select a name --");
  });

  it("adds name to house div and removes from participant list", () => {
    const appendChildSpy = vi.fn();
    stubProperty(select.previousElementSibling, "appendChild", appendChildSpy);
    change("#house-0-select", "Alex");
    const nameDiv = document.querySelector("#wrapper-Alex");
    expect(appendChildSpy).toHaveBeenCalledWith(nameDiv);
  })

  it("adds name to house in state", () => {
    change("#house-0-select", "Alex");
    expect(state.houses["house-0"]).toContain("Alex");
  })

  it("adds name to participant list and removes from house div", () => {
    const appendChildSpy = vi.fn();
    stubPropertyByID("participants", "appendChild", appendChildSpy);
    change("#house-0-select", "Alex");
    change("#name-list-select", "Alex");
    const nameDiv = document.querySelector("#wrapper-Alex");
    expect(appendChildSpy).toHaveBeenCalledWith(nameDiv);
  })

  it("calls removeNameFromHouse when moving name from house to main list", () => {
    change("#house-0-select", "Alex");
    const nameDiv = document.querySelector("#wrapper-Alex");
    const house0 = document.querySelector("#house-0");
    const nameContainer = house0?.querySelector(".name-container");

    // Stub the parentNode and closest methods to simulate Alex being in house-0
    Object.defineProperty(nameDiv, 'parentNode', {
      configurable: true,
      get: () => nameContainer
    });

    stubProperty(nameContainer, 'closest', vi.fn(() => house0));
    const removeNameSpy = vi.spyOn(stateModule, "removeNameFromHouse");
    change("#name-list-select", "Alex");

    expect(removeNameSpy).toHaveBeenCalledWith("house-0", "Alex");
  })
});
