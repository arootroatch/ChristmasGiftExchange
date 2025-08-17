export function addEventListener(thing, event, func) {
    document.getElementById(thing).addEventListener(event, func);
}

export function removeEventListener(thing, event, func) {
    document.getElementById(thing).removeEventListener(event, func);
}

export function pushHTMl(thing, html) {
    document.getElementById(thing).insertAdjacentHTML("beforeend", html);
}

export function unshiftHTMl(thing, html) {
    document.getElementById(thing).insertAdjacentHTML("afterbegin", html);
}

export function setLoadingState(thing) {
    const btn = document.getElementById(thing);
    btn.innerHTML = "Loading...";
    btn.style.color = "#808080";
}