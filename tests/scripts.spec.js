// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {addHouse, addName, deleteHouse, Giver, insertNameFromSelect, refreshNameSelects} from '/resources/js/scripts.js'
import {
    clearNameSelects,
    click,
    resetState,
    shouldBeDraggable,
    shouldSelect,
    stubProperty,
    stubPropertyByID
} from "./specHelper";
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
            clearNameSelects();
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
            stubPropertyByID("wrapper-Alex", "remove", removeSpy);
            stubPropertyByID("delete-Alex1", "removeEventListener", removeEventListenerSpy);

            expect(state.givers[0].name).toEqual("Alex");
            click("delete-Alex1");
            expect(removeSpy).toHaveBeenCalledTimes(1);
            expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
            expect(state.givers).toEqual([]);
        });

        it("adds names to dropdown", () => {
            const nameSelects = document.getElementsByClassName("name-select");
            input.value = "whitney";
            click("b0");
            expect(nameSelects[0].innerHTML).toContain("Alex");
            expect(nameSelects[0].innerHTML).toContain("Whitney");
        })

        it("clicking delete x removes name from dropdown selects", () => {
            const nameSelects = document.getElementsByClassName("name-select");
            input.value = "whitney";
            click("b0");
            click("delete-Alex1");
            expect(nameSelects[0].innerHTML).not.toContain("Alex");
        });
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
            click("addHouse");
        })

        it('should add house to DOM', () => {
            shouldSelect("select-0");
            shouldSelect("house-0");
            shouldSelect("delete-0");
        });

        it('adds click event listener to delete house button', () => {
            expect(addEventListener).toHaveBeenCalledWith("delete-0", "click", deleteHouse);
        });

        it('adds change event listener to name select', () => {
            expect(addEventListener).toHaveBeenCalledWith("select-0", "change", insertNameFromSelect);
        });
    });

    describe('insertNameFromSelect', () => {
        let select;
        beforeEach(() => {
            resetState();
            clearNameSelects();
            document.getElementById("input0").value = "Alex";
            click("b0");
            addHouse();
            refreshNameSelects();
            select = document.getElementById("select-0");
        })

        it('sets select back to default', () => {
            select.value = "Alex";
            select.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));
            expect(select.textContent).toContain("-- Select a name --");
        });

        it("adds name to house div and removes from participant list", () => {
            const appendChildSpy = vi.fn();
            stubProperty(select.previousElementSibling, "appendChild", appendChildSpy);
            select.value = "Alex";
            select.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));
            const nameDiv = document.getElementById("wrapper-Alex");
            expect(appendChildSpy).toHaveBeenCalledWith(nameDiv);
        })

        it("adds name to participant list and removes from house div", () => {
            select = document.getElementById("name-list-select");
            const appendChildSpy = vi.fn();
            stubPropertyByID("participants", "appendChild", appendChildSpy);
            select.value = "Alex";
            select.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));
            const nameDiv = document.getElementById("wrapper-Alex");
            expect(appendChildSpy).toHaveBeenCalledWith(nameDiv);
        })
    });

    describe("deleteHouse", () => {
        let select;
        beforeEach(() => {
            resetState();
            document.getElementById("input0").value = "Alex";
            click("b0");
            // document.getElementById("input0").value = "Whitney";
            // click("b0");
            addHouse();
            select = document.getElementById("select-0");
            select.value = "Alex";
            select.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));
            // select.value = "Whitney";
            // select.dispatchEvent(new Event('change', {bubbles: true, cancelable: true}));
        })

        // TODO not the best test - only works with the first name.
        it("puts names back in participants list", () => {
            const appendChildSpy = vi.fn();
            stubPropertyByID("participants", "appendChild", appendChildSpy);
            click("delete-0");
            expect(appendChildSpy).toHaveBeenCalledWith(document.getElementById("wrapper-Alex"));
        })

        it("deletes houseDiv", ()  => {
            const houseDiv = document.getElementById("house-0");
            const removeSpy = vi.fn();
            stubProperty(houseDiv, "remove", removeSpy)
            click("delete-0");
            expect(removeSpy).toHaveBeenCalled();
        })


    });
});