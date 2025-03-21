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

export function shouldSelect(thing){
    expect(document.getElementById(thing)).not.toBeNull();
}

export function shouldNotSelect(thing){
    expect(document.getElementById(thing)).toBeNull();
}

export function shouldBeDraggable(thing){
    expect(document.getElementById(thing).draggable).toBe(true);
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