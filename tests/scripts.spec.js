// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {addHouse, deleteHouse, Giver, insertName} from '/resources/js/scripts.js'
import {click, resetState, shouldBeDraggable, shouldSelect, stubProperty} from "./specHelper";
import state from "../resources/js/state";
import {addEventListener} from "../resources/js/utils";


describe('scripts', () => {
    it('Giver constructor', () => {
        const giver = new Giver("Alex", "Whitney", "alex@gmail.com");
        expect(giver.name).toBe("Alex");
        expect(giver.email).toBe("alex@gmail.com");
        expect(giver.recipient).toBe("Whitney");
        expect(giver.date).toBe("");
        expect(giver.id).toBe("");
    });

    describe('addName', () => {
        const input = document.getElementById("input0");
        beforeEach(() => {
            resetState();
            input.value = "alex";
            click("b0");
        })

        it('should add name to DOM', () => {
            shouldSelect("wrapper-Alex");
            shouldSelect("delete-Alex1");
            shouldSelect("Alex1");
            shouldSelect("brAlex1");
            shouldBeDraggable("wrapper-Alex");
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
            click("delete-Alex1");
            expect(state.givers.length).toBe(1);
            expect(state.givers[0].name).toEqual("Whitney");
        })

        it("clicking delete x removes name from DOM", () => {
            const removeSpy = vi.fn();
            const removeEventListenerSpy = vi.fn();
            stubProperty("wrapper-Alex", "remove", removeSpy);
            stubProperty("delete-Alex1", "removeEventListener", removeEventListenerSpy);

            expect(state.givers[0].name).toEqual("Alex");
            click("delete-Alex1");
            expect(removeSpy).toHaveBeenCalledTimes(1);
            expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
            expect(state.givers).toEqual([]);
        });

        it("adds names to dropdown when more than one house", () => {
            addHouse();
            addHouse();
            const nameSelects = document.getElementsByClassName("name-select");
            expect(nameSelects.length).toBe(2);
            input.value = "whitney";
            click("b0");
            expect(nameSelects[0].innerHTML).toContain("Alex");
            expect(nameSelects[0].innerHTML).toContain("Whitney");
            expect(nameSelects[1].innerHTML).toContain("Alex");
            expect(nameSelects[1].innerHTML).toContain("Whitney");
        })
    });

    describe('addHouse', () => {
        vi.mock(import("/resources/js/utils.js"), async (importOriginal) => {
            const original = await importOriginal();
            return {
                ...original,
                addEventListener: vi.fn(original.addEventListener),
            };
        });

        beforeEach(() => {
            resetState();
            click("b0");
        })

        it('should add house to DOM', () => {
            shouldSelect("0-select");
            shouldSelect("0");
            shouldSelect("delete-0");
        });

        it('adds click event listener to delete house button', () => {
            expect(addEventListener).toHaveBeenCalledWith("delete-0", "click", deleteHouse);
        });

        it('adds change event listener to name select', () => {
            expect(addEventListener).toHaveBeenCalledWith("0-select", "change", insertName);
        });
    });

    // describe('insertName', () => {
    //
    // });
});