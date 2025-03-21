export function addEventListener(thing, event, func) {
    document.getElementById(thing).addEventListener(event, func);
}

export function removeEventListener(thing, event, func) {
    document.getElementById(thing).removeEventListener(event, func);
}

export function pushHTMl(thing, html) {
    document.getElementById(thing).insertAdjacentHTML("beforeend", html);
}