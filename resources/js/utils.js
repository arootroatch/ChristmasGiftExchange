export function selectElement(selector){
    return document.querySelector(selector);
}

export function click(selector){
    document.querySelector(selector).click();
}

export function addEventListener(selector, event, func) {
    const element = document.querySelector(selector);
    if (element) {
        element.addEventListener(event, func);
    }
}

export function removeEventListener(selector, event, func) {
    document.querySelector(selector).removeEventListener(event, func);
}

export function pushHTMl(selector, html) {
    document.querySelector(selector).insertAdjacentHTML("beforeend", html);
}

export function unshiftHTMl(selector, html) {
    document.querySelector(selector).insertAdjacentHTML("afterbegin", html);
}

export function setLoadingState(selector) {
    const btn = document.querySelector(selector);
    btn.innerHTML = "Loading...";
    btn.style.color = "#808080";
}

export async function fetchWithErrorHandling(url, options = {}) {
    try {
        return await fetch(url, options);
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}