import state from "../resources/js/state";
import {expect, vi} from "vitest";

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
    giverNames.forEach((name) => {
        state.givers.push({name: name, recipient: "", email: "", date: "", id: ""});
    })
}

export function shouldSelect(thing) {
    expect(document.getElementById(thing)).not.toBeNull();
}

export function shouldNotSelect(thing) {
    expect(document.getElementById(thing)).toBeNull();
}

export function shouldBeDraggable(thing) {
    expect(document.getElementById(thing).draggable).toBe(true);
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

export const clickEvent = new Event('click', {bubbles: true, cancelable: true});

export function click(thing) {
    const element = document.getElementById(thing);
    element.dispatchEvent(clickEvent);
}

export function clearNameSelects() {
    let selects = Array.from(document.getElementsByClassName("name-select"));
    selects.map((select) => {
        select.innerHTML = `<option disabled selected value="default">-- Select a name --</option>`;
    });
}

export function resetState() {
    state = {
        houses: [],
        generated: false,
        duplicate: null,
        availRecipients: [],
        introIndex: 0,
        secretSanta: false,
        givers: [],
        houseID: 0,
        nameNumber: 1
    }
}

