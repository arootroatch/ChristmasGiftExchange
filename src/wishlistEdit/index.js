import * as snackbar from '../Snackbar.js';
import * as greeting from './components/Greeting.js';
import * as wishlistList from './components/WishlistList.js';
import * as itemList from './components/ItemList.js';
import * as saveButton from './components/SaveButton.js';
import * as contactForm from './components/ContactForm.js';
import {setUserData} from './state.js';

function extractToken() {
    const match = window.location.pathname.match(/\/wishlist\/edit\/([^/]+)/);
    return match ? match[1] : "";
}

function redirectWithError() {
    sessionStorage.setItem("snackbarError", "Invalid wishlist link");
    try { window.location.href = "/"; } catch (_) { /* JSDOM */ }
}

async function loadUser(token) {
    if (!token) {
        redirectWithError();
        return;
    }
    const response = await fetch(`/.netlify/functions/api-user-get/${token}`);
    if (!response.ok) {
        redirectWithError();
        return;
    }
    const data = await response.json();
    setUserData(data);
}

export function main() {
    const token = extractToken();
    snackbar.init();
    greeting.init();
    wishlistList.init();
    itemList.init();
    saveButton.init(token);
    contactForm.init(token);
    loadUser(token);
}
