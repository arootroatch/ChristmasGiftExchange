import {apiFetch} from '../utils.js';
import * as snackbar from '../Snackbar.js';
import * as cookieBanner from '../CookieBanner.js';
import * as greeting from './components/Greeting.js';
import * as wishlistList from './components/WishlistList.js';
import * as itemList from './components/ItemList.js';
import * as saveButton from './components/SaveButton.js';
import * as contactForm from './components/ContactForm.js';
import {setUserData} from './state.js';
import {authGateTemplate, initAuthGate} from '../authGate.js';

function hasLegacyToken() {
    return new URLSearchParams(window.location.search).has("user");
}

function showAuthGate(message) {
    const container = document.getElementById("container");
    container.innerHTML = `
        ${message ? `<p class="auth-message">${message}</p>` : ''}
        ${authGateTemplate()}
    `;
    initAuthGate({
        onSuccess: () => {
            container.innerHTML = pageSlots();
            initPage();
            loadPage();
        },
        onError: (msg) => snackbar.showError(msg),
    });
}

function pageSlots() {
    return `
    <div data-slot="greeting"></div>
    <div data-slot="wishlists"></div>
    <div data-slot="items"></div>
    <div data-slot="save"></div>
    <hr/>
    <div data-slot="contact"></div>`;
}

function initPage() {
    greeting.init();
    wishlistList.init();
    itemList.init();
    saveButton.init();
    contactForm.init();
}

function loadPage() {
    apiFetch("/.netlify/functions/api-user-get", {
        method: "GET",
        onSuccess: (data) => setUserData(data),
        onError: () => {
            showAuthGate();
        },
    });
}

export function main() {
    snackbar.init();
    cookieBanner.init();

    if (hasLegacyToken()) {
        showAuthGate("This link has expired. Enter your email to get a new verification code.");
        return;
    }

    initPage();
    loadPage();
}
