import {beforeEach, beforeAll, describe, expect, it, vi} from "vitest";
import {
    clearNameSelects,
    click,
    resetState,
    shouldBeDraggable,
    shouldSelect,
    stubProperty,
    stubPropertyByID,
    addHouseToDOM,
    change,
    addNamesToDOM,
    initReactiveSystem
} from "../specHelper";
import {Giver, initEventListeners} from "../../resources/js/components/name";
import state from "../../resources/js/state";
import * as house from "../../resources/js/components/house";

describe('addName', () => {
    const input = document.querySelector("#input0");

    beforeAll(() => {
        initReactiveSystem();
        initEventListeners();
    });
    beforeEach(() => {
        resetState();
        clearNameSelects();
        addNamesToDOM("alex");
    })

    it('Giver constructor', () => {
        const giver = new Giver("Alex", "Whitney", "alex@gmail.com");
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
        state.givers.push(new Giver("Whitney", "", ""));
        expect(state.givers.length).toBe(2);
        click("#delete-Alex1");
        expect(state.givers.length).toBe(1);
        expect(state.givers[0].name).toEqual("Whitney");
    })

    it("clicking delete x removes name from DOM", () => {
        const removeSpy = vi.fn();
        const removeEventListenerSpy = vi.fn();
        stubPropertyByID("wrapper-Alex", "remove", removeSpy);
        stubPropertyByID("delete-Alex1", "removeEventListener", removeEventListenerSpy);

        expect(state.givers[0].name).toEqual("Alex");
        click("#delete-Alex1");
        expect(removeSpy).toHaveBeenCalledTimes(1);
        expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
        expect(state.givers).toEqual([]);
    });

    it("adds names to dropdown", () => {
        const nameSelects = document.getElementsByClassName("name-select");
        input.value = "whitney";
        click("#b0");
        expect(nameSelects[0].innerHTML).toContain("Alex");
        expect(nameSelects[0].innerHTML).toContain("Whitney");
    })

    it("clicking delete x removes name from dropdown selects", () => {
        const nameSelects = document.getElementsByClassName("name-select");
        input.value = "whitney";
        click("#b0");
        click("#delete-Alex1");
        expect(nameSelects[0].innerHTML).not.toContain("Alex");
    });

    it("clicking delete x removes name from house in state if it's in a house", () => {
        house.initEventListeners();
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
        house.initEventListeners();
        addHouseToDOM();
        const previousHouses = {...state.houses};
        click("#delete-Alex1");
        expect(state.houses).toEqual(previousHouses);
    });
});