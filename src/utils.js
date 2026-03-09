export const serverErrorMessage = "Aw shucks! Something went wrong. Don't worry - the developer has been notified.";
export const leftContainerId = "left-container";
export const nameListId = "name-list";
export const participantsId = "participants";

export function selectElement(selector){
    return document.querySelector(selector);
}

export function selectElements(selector){
    return document.querySelectorAll(selector);
}

export function click(selector){
    document.querySelector(selector)?.click();
}

export function addEventListener(selector, event, func) {
    const element = document.querySelector(selector);
    if (element) {
        element.addEventListener(event, func);
    }
}

export function removeEventListener(selector, event, func) {
    document.querySelector(selector)?.removeEventListener(event, func);
}

export function pushHTML(selector, html) {
    document.querySelector(selector).insertAdjacentHTML("beforeend", html);
}

export function unshiftHTML(selector, html) {
    document.querySelector(selector).insertAdjacentHTML("afterbegin", html);
}

export function setLoadingState(selector) {
    const btn = document.querySelector(selector);
    btn.textContent = "Loading...";
    btn.style.color = "#808080";
}

export function isMobileDevice(userAgent = navigator.userAgent) {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
}

export function addKeybinding(handler) {
    if (!isMobileDevice()) {
        window.addEventListener("keyup", handler);
    }
}

export function removeKeybinding(handler) {
    window.removeEventListener("keyup", handler);
}

export function escape(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

export function escapeAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/'/g, "&#39;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function apiFetch(url, {method, body, onSuccess, onError, fallbackMessage = "Something went wrong. Please try again."} = {}) {
    try {
        const response = await fetch(url, {
            method,
            ...(body && {headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)}),
        });
        if (response.status >= 500) {
            onError(serverErrorMessage);
            return;
        }
        if (!response.ok) {
            let errorMessage;
            try { errorMessage = (await response.json()).error; } catch {}
            onError(errorMessage || fallbackMessage);
            return;
        }
        const data = await response.json();
        onSuccess(data);
    } catch (error) {
        onError(serverErrorMessage);
    }
}
