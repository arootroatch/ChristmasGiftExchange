import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {
  addHouseToDOM,
  addNamesToDOM,
  clearNameSelects,
  click,
  initReactiveSystem,
  resetState,
  shouldBeDraggable,
  shouldNotSelect,
  shouldSelect,
  stubProperty
} from "../specHelper";
import {state} from "../../resources/js/state";
import {alex, whitney} from "../testData";

describe('addName', () => {
  let input;

  beforeAll(() => {
    initReactiveSystem();
  });
  beforeEach(() => {
    resetState();
    clearNameSelects();
    addNamesToDOM("alex");
    input = document.querySelector("#input0");
  })

  it('Giver object shape', () => {
    const giver = {...alex, recipient: whitney.name};
    expect(giver.name).toBe("Alex");
    expect(giver.email).toBe("alex@gmail.com");
    expect(giver.recipient).toBe("Whitney");
    expect(giver.date).toBe("");
    expect(giver.id).toBe("");
  });

  it('should add name to DOM', () => {
    shouldSelect("#wrapper-Alex");
    shouldSelect("#delete-Alex1");
    shouldSelect("#Alex1");
    shouldSelect("#brAlex1");
    shouldBeDraggable("#wrapper-Alex");
  });

  it('should add name to state', () => {
    expect(state.givers[0].name).toBe("Alex");
    expect(state.givers.length).toBe(1);
    expect(state.nameNumber).toBe(2);
  });

  it('should clear input field', () => {
    expect(input.value).toBe("");
  })

  it("clicking delete x removes name from state", () => {
    expect(state.givers[0].name).toEqual("Alex");
    state.givers.push({...whitney});
    expect(state.givers.length).toBe(2);
    click("#delete-Alex1");
    expect(state.givers.length).toBe(1);
    expect(state.givers[0].name).toEqual("Whitney");
  })

  it("clicking delete x removes name from DOM", () => {
    expect(state.givers[0].name).toEqual("Alex");
    click("#delete-Alex1");
    // In reactive architecture, element is re-rendered, so check it no longer exists
    shouldNotSelect("#wrapper-Alex");
    expect(state.givers).toEqual([]);
  });

  it("adds names to dropdown", () => {
    addHouseToDOM();  // Need at least one house to have a select dropdown
    input.value = "whitney";
    click("#b0");
    const nameSelects = document.getElementsByClassName("name-select");
    expect(nameSelects[0].innerHTML).toContain("Alex");
    expect(nameSelects[0].innerHTML).toContain("Whitney");
  })

  it("clicking delete x removes name from dropdown selects", () => {
    addHouseToDOM();  // Need at least one house to have a select dropdown
    input.value = "whitney";
    click("#b0");
    // Get the delete button ID from the DOM (it may have changed due to re-rendering)
    const alexDeleteBtn = document.querySelector('[id^="delete-Alex"]');
    const deleteId = alexDeleteBtn.id;
    const nameSelects = document.getElementsByClassName("name-select");
    click(`#${deleteId}`);
    expect(nameSelects[0].innerHTML).not.toContain("Alex");
  });

  it("clicking delete x removes name from house in state if it's in a house", () => {
    addHouseToDOM();

    // Set up: manually put Alex in house-0 (both state and DOM)
    state.houses["house-0"] = ["Alex"];
    const nameDiv = document.querySelector("#wrapper-Alex");
    const nameContainer = document.querySelector("#house-0 .name-container");
    const house0 = document.querySelector("#house-0");

    // Stub the parentNode and closest methods to simulate Alex being in house-0
    Object.defineProperty(nameDiv, 'parentNode', {
      configurable: true,
      get: () => nameContainer
    });
    stubProperty(nameContainer, 'closest', vi.fn(() => house0));

    expect(state.houses["house-0"]).toContain("Alex");
    click("#delete-Alex1");
    expect(state.houses["house-0"]).not.toContain("Alex");
  });

  it("clicking delete x on name in main list does not affect state.houses", () => {
    addHouseToDOM();
    const previousHouses = {...state.houses};
    click("#delete-Alex1");
    expect(state.houses).toEqual(previousHouses);
  });
});
