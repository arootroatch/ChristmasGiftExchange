import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  addHouseToDOM,
  change,
  clearNameSelects,
  click,
  enterName,
  initReactiveSystem,
  moveNameToHouse,
  removeAllHouses,
  removeAllNames,
  resetState,
  shouldNotSelect,
  shouldSelect,
  stubProperty
} from "../../specHelper";
import {addEventListener} from "../../../src/utils";
import {insertNameFromSelect} from "../../../src/exchange/components/Select";
import {addHouseToState, getState} from "../../../src/exchange/state";
import * as stateModule from "../../../src/exchange/state";

window.scrollTo = vi.fn();

describe('addHouse', () => {
  vi.mock(import("/src/utils.js"), async (importOriginal) => {
    const original = await importOriginal();
    return {
      ...original,
      addEventListener: vi.fn(original.addEventListener),
    };
  });

  beforeAll(() => {
    initReactiveSystem();
  });

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
    const house = getState().houses.find(h => h.id === "house-0");
    expect(house).toBeDefined();
    expect(house.members).toEqual([]);
  });

  it('adds click event listener to delete house button', () => {
    expect(addEventListener).toHaveBeenCalledWith("#house-0-delete", "click", expect.any(Function));
  });

  it('adds change event listener to name select', () => {
    expect(addEventListener).toHaveBeenCalledWith("#house-0-select", "change", insertNameFromSelect);
  });

  it("scrolls page to bottom after other event handlers complete", () => {
    vi.useFakeTimers();
    window.scrollTo.mockClear();
    addHouseToDOM();

    expect(window.scrollTo).not.toHaveBeenCalled();
    vi.runAllTimers();

    expect(window.scrollTo).toHaveBeenLastCalledWith({top: document.body.scrollHeight, behavior: 'smooth'});
    vi.useRealTimers();
  });
});

describe("deleteHouse", () => {

  beforeAll(() => {
    initReactiveSystem();
  });
  beforeEach(() => {
    resetState();
    removeAllNames();
    enterName("Alex");
    enterName("Whitney");
    addHouseToDOM();
    moveNameToHouse("#house-0-select", "Alex");
    moveNameToHouse("#house-0-select", "Whitney");
  });

  it("puts names back in participants list", () => {
    expect(document.querySelectorAll("#house-0 .name-container .name-wrapper").length).toBe(2);
    expect(getState().participants.length).toBe(2);
    expect(getState().houses.find(h => h.id === "house-0").members.length).toBe(2);

    click("#house-0-delete")

    // Verify state is updated
    expect(getState().houses.find(h => h.id === "house-0")).toBeUndefined();

    // Verify names are back in participants list
    const participants = document.querySelector("#participants");
    const participantNames = Array.from(participants.querySelectorAll(".name-wrapper"));
    expect(participantNames.length).toBe(2);

    // Verify names are Alex and Whitney
    const nameTexts = participantNames.map(el => el.querySelector('.name-entered').textContent);
    expect(nameTexts).toContain('Alex');
    expect(nameTexts).toContain('Whitney');
  });

  it("deletes houseDiv", () => {
    const houseDiv = document.querySelector("#house-0");
    const removeSpy = vi.fn();
    stubProperty(houseDiv, "remove", removeSpy)
    click("#house-0-delete");
    expect(removeSpy).toHaveBeenCalled();
  })

  it("removes house from state", () => {
    expect(getState().houses.find(h => h.id === "house-0")).toBeDefined();
    click("#house-0-delete");
    expect(getState().houses.find(h => h.id === "house-0")).toBeUndefined();
  })


});

describe('insertNameFromSelect', () => {
  let select;

  beforeAll(() => {
    initReactiveSystem();
  });

  beforeEach(() => {
    resetState();
    removeAllNames();
    removeAllHouses();
    clearNameSelects();
    enterName("Alex");
    addHouseToDOM();
    select = document.querySelector("#house-0-select");
  })

  it('sets select back to default', () => {
    change("#house-0-select", "Alex");
    expect(select.textContent).toContain("-- Select a name --");
  });

  it("adds name to house div and removes from participant list", () => {
    change("#house-0-select", "Alex");
    // Check that Alex is now in the house container (re-rendered by reactive system)
    shouldSelect("#house-0 .name-container #wrapper-Alex");
    // Check that Alex is not in participants list
    shouldNotSelect("#participants #wrapper-Alex");
  })

  it("adds name to house in state", () => {
    change("#house-0-select", "Alex");
    expect(getState().houses.find(h => h.id === "house-0").members).toContain("Alex");
  })

  it("adds name to participant list and removes from house div", () => {
    change("#house-0-select", "Alex");
    change("#name-list-select", "Alex");
    // Check that Alex is now in participants list (re-rendered by reactive system)
    shouldSelect("#participants #wrapper-Alex");
    // Check that Alex is not in house container
    shouldNotSelect("#house-0 .name-container #wrapper-Alex");
  })

  it("calls removeNameFromHouse when moving name from house to main list", () => {
    change("#house-0-select", "Alex");

    const removeNameSpy = vi.spyOn(stateModule, "removeNameFromHouse");
    change("#name-list-select", "Alex");

    expect(removeNameSpy).toHaveBeenCalledWith("house-0", "Alex");
  })
});
