import state, {updateState} from "../resources/js/state";
import {expect, vi} from "vitest";
import {indexHtml} from "../setupTests";

export function installGivers(givers) {
    state.givers = givers;
}

export function stubFetch(ok, status, body) {
    global.fetch = vi.fn(() => Promise.resolve({
        ok: ok,
        status: status,
        json: () => Promise.resolve(body)
    }));
}

export function stubFetchError(message) {
    global.fetch = vi.fn(() => Promise.reject({
        status: 500,
        message: message
    }));
}

export function installGiverNames(giverNames) {
    const newGivers = giverNames.map((name) => ({
        name: name,
        recipient: "",
        email: "",
        date: "",
        id: ""
    }));
    updateState({ givers: [...state.givers, ...newGivers] });
}

export function shouldSelect(thing) {
    expect(document.querySelector(thing)).not.toBeNull();
}

export function shouldNotSelect(thing) {
    expect(document.querySelector(thing)).toBeNull();
}

export function shouldBeDraggable(thing) {
    expect(document.querySelector(thing).draggable).toBe(true);
}

export function stubPropertyByID(thing, event, func) {
    const element = document.getElementById(thing);
    Object.defineProperty(element, event, {
        configurable: true,
        value: func,
    });
}

export function stubProperty(thing, event, func) {
    Object.defineProperty(thing, event, {
        configurable: true,
        value: func,
    });
}

export function click(thing) {
    const clickEvent = new Event('click', {bubbles: true, cancelable: true});
    const element = document.querySelector(thing);
    element.dispatchEvent(clickEvent);
}

export function change(selector, value){
    const changeEvent = new Event('change', {bubbles: true, cancelable: true});
    const element = document.querySelector(selector);
    Object.defineProperty(changeEvent, 'target', {
        writable: false,
        value: element
    });
    element.value = value;
    element.dispatchEvent(changeEvent);
}

export function clearNameSelects() {
    let selects = Array.from(document.getElementsByClassName("name-select"));
    selects.map((select) => {
        select.innerHTML = `<option disabled selected value="default">-- Select a name --</option>`;
    });
}

export function resetState() {
    updateState({
        houses: [],
        generated: false,
        duplicate: null,
        availRecipients: [],
        introIndex: 0,
        secretSanta: false,
        givers: [],
        houseID: 0,
        nameNumber: 1
    });
}

export function resetDOM(){
    document.open();
    document.write(indexHtml);
    document.close();
}

export function removeAllNames(){
    const names = document.querySelectorAll(".name-wrapper");
    names.forEach((name) => {name.remove();});
}
