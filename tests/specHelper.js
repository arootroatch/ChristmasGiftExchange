import state from "../resources/js/state";
import {vi} from "vitest";

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