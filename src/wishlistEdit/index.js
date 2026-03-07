import * as snackbar from '../components/Snackbar.js';
import * as greeting from './Greeting.js';
import * as wishlistList from './WishlistList.js';
import * as itemList from './ItemList.js';
import * as saveButton from './SaveButton.js';
import * as contactForm from './ContactForm.js';
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
