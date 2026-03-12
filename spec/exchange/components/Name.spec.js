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
} from "../../specHelper";
import {getState, addNameToHouse} from "../../../src/exchange/state";
import {alex, whitney} from "../../testData";

describe('addName', () => {
  let input;

  beforeAll(() => {
    initReactiveSystem();
  });
  beforeEach(() => {
    resetState();
    clearNameSelects();
    addNamesToDOM("alex");
    input = document.querySelector("#name-input");
  })

  it('Participant object shape', () => {
    const participant = {...alex};
    expect(participant.name).toBe("Alex");
    expect(participant.email).toBe("alex@gmail.com");
  });

  it('should add name to DOM', () => {
    shouldSelect("#wrapper-Alex");
    shouldSelect("#delete-Alex1");
    shouldSelect("#Alex1");
    shouldBeDraggable("#wrapper-Alex");
  });

  it('should add name to state', () => {
    expect(getState().participants[0].name).toBe("Alex");
    expect(getState().participants.length).toBe(1);
    expect(getState().nameNumber).toBe(2);
  });

  it('should clear input field', () => {
    expect(input.value).toBe("");
  })

  it("clicking delete x removes name from state", () => {
    expect(getState().participants[0].name).toEqual("Alex");
    getState().participants.push({...whitney});
    expect(getState().participants.length).toBe(2);
    click("#delete-Alex1");
    expect(getState().participants.length).toBe(1);
    expect(getState().participants[0].name).toEqual("Whitney");
  })

  it("adds animated class only to the newly added name", () => {
    addNamesToDOM("Bob");

    const alice = document.querySelector('#wrapper-Alex');
    const bob = document.querySelector('#wrapper-Bob');

    expect(alice.classList.contains('animated')).toBe(false);
    expect(bob.classList.contains('animated')).toBe(true);
  });

  it("clicking delete x removes name from DOM", () => {
    expect(getState().participants[0].name).toEqual("Alex");
    click("#delete-Alex1");
    // In reactive architecture, element is re-rendered, so check it no longer exists
    shouldNotSelect("#wrapper-Alex");
    expect(getState().participants).toEqual([]);
  });

  it("adds names to dropdown", () => {
    addHouseToDOM();  // Need at least one house to have a select dropdown
    input.value = "whitney";
    click("#add-name-btn");
    const nameSelects = document.getElementsByClassName("name-select");
    expect(nameSelects[0].innerHTML).toContain("Alex");
    expect(nameSelects[0].innerHTML).toContain("Whitney");
  })

  it("clicking delete x removes name from dropdown selects", () => {
    addHouseToDOM();  // Need at least one house to have a select dropdown
    input.value = "whitney";
    click("#add-name-btn");
    // Get the delete button ID from the DOM (it may have changed due to re-rendering)
    const alexDeleteBtn = document.querySelector('[id^="delete-Alex"]');
    const deleteId = alexDeleteBtn.id;
    const nameSelects = document.getElementsByClassName("name-select");
    click(`#${deleteId}`);
    expect(nameSelects[0].innerHTML).not.toContain("Alex");
  });

  it("clicking delete x removes name from house in state if it's in a house", () => {
    addHouseToDOM();
    addNameToHouse("house-0", "Alex");

    const house = getState().houses.find(h => h.id === "house-0");
    expect(house.members).toContain("Alex");
    const deleteBtn = document.querySelector('[id^="delete-Alex"]');
    click(`#${deleteBtn.id}`);
    expect(house.members).not.toContain("Alex");
  });

  it("escapes HTML in name to prevent XSS", () => {
    const input = document.querySelector("#name-input");
    input.value = '<img src=x onerror=alert(1)>';
    click("#add-name-btn");
    const nameEl = document.querySelectorAll(".name-entered")[1];
    expect(nameEl.innerHTML).not.toContain("<img");
  });

  it("clicking delete x on name in main list does not affect getState().houses", () => {
    addHouseToDOM();
    const previousHouses = structuredClone(getState().houses);
    click("#delete-Alex1");
    expect(getState().houses).toEqual(previousHouses);
  });
});
