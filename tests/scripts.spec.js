// @vitest-environment jsdom

import {beforeEach, describe, expect, it, vi} from 'vitest'
import {addHouse, Giver} from '/resources/js/scripts.js'
import {resetState, shouldBeDraggable, shouldNotSelect, shouldSelect} from "./specHelper";
import state from "../resources/js/state";
import {waitFor, waitForElementToBeRemoved} from '@testing-library/dom';


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
        const addNameBtn = document.getElementById("b0");
        beforeEach(() => {
            resetState();
            document.getElementById("input0").value = "alex";
            addNameBtn.dispatchEvent(new Event("click", {bubbles: true, cancelable: true}));
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
            expect(document.getElementById("input0").value).toBe("");
        })

        it("clicking delete x removes name from state", () => {
            expect(state.givers[0].name).toEqual("Alex");
            state.givers.push(new Giver("Whitney", "", ""));
            expect(state.givers.length).toBe(2);
            document.getElementById("delete-Alex1")
                .dispatchEvent(new Event("click", {bubbles: true, cancelable: true}));
            expect(state.givers.length).toBe(1);
            expect(state.givers[0].name).toEqual("Whitney");
        })

        it("clicking delete x removes name from DOM", () => {
            const wrapper = document.getElementById("wrapper-Alex");
            const removeSpy = vi.fn();
            Object.defineProperty(wrapper, "remove", {
                configurable: true,
                value: removeSpy,
            });

            expect(state.givers[0].name).toEqual("Alex");
            document.getElementById("delete-Alex1")
                .dispatchEvent(new Event("click", {bubbles: true, cancelable: true}));
            expect(removeSpy).toHaveBeenCalledTimes(1);
        });

        it("adds names to dropdown when more than one house", () => {
            addHouse();
            addHouse();
            expect(document.getElementsByClassName("name-select").length).toBe(2);
            document.getElementById("input0").value = "whitney";
            addNameBtn.dispatchEvent(new Event("click", {bubbles: true, cancelable: true}));
            expect(document.getElementsByClassName("name-select")[0].innerHTML).toContain("Alex");
            expect(document.getElementsByClassName("name-select")[0].innerHTML).toContain("Whitney");
            expect(document.getElementsByClassName("name-select")[1].innerHTML).toContain("Alex");
            expect(document.getElementsByClassName("name-select")[1].innerHTML).toContain("Whitney");
        })


    });
});