import * as snackbar from '../Snackbar.js';
import * as cookieBanner from '../CookieBanner.js';
import * as greeting from './components/Greeting.js';
import * as wishlistList from './components/WishlistList.js';
import * as itemList from './components/ItemList.js';
import * as saveButton from './components/SaveButton.js';
import * as contactForm from './components/ContactForm.js';
import {setUserData} from './state.js';

function extractToken() {
    const token = new URLSearchParams(window.location.search).get("user") || "";
    history.replaceState(null, '', window.location.pathname);
    return token;
}

function redirectWithError() {
    sessionStorage.setItem("snackbarError", "Invalid wishlist link");
    window.location.href = "/";
}

async function loadUser() {
    const response = await fetch("/.netlify/functions/api-user-get");
    if (!response.ok) {
        redirectWithError();
        return;
    }
    return await response.json();
}

export function main() {
    const token = extractToken();
    snackbar.init();
    cookieBanner.init();
    greeting.init();
    wishlistList.init();
    itemList.init();
    saveButton.init();
    contactForm.init(token);
    loadUser().then(r => (r && setUserData(r)));
}
