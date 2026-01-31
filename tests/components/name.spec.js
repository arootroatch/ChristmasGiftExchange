import {beforeEach, beforeAll, describe, expect, it, vi} from "vitest";
import {clearNameSelects, click, resetState, shouldBeDraggable, shouldSelect, stubPropertyByID} from "../specHelper";
import {Giver, initEventListeners} from "../../resources/js/components/name";
import state from "../../resources/js/state";

describe('addName', () => {
    const input = document.querySelector("#input0");

    beforeAll(initEventListeners);
    beforeEach(() => {
        resetState();
        clearNameSelects();
        input.value = "alex";
        click("#b0");
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
});