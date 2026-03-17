import * as snackbar from '../Snackbar.js';
import * as greeting from './components/Greeting.js';
import * as wishlistList from './components/WishlistList.js';
import * as itemList from './components/ItemList.js';
import * as saveButton from './components/SaveButton.js';
import * as contactForm from './components/ContactForm.js';
import {setUserData} from './state.js';

function extractToken() {
    return new URLSearchParams(window.location.search).get("user") || "";
}

function redirectWithError() {
    sessionStorage.setItem("snackbarError", "Invalid wishlist link");
    window.location.href = "/";
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
    return await response.json();
}

export function main() {
    const token = extractToken();
    snackbar.init();
    greeting.init();
    wishlistList.init();
    itemList.init();
    saveButton.init(token);
    contactForm.init(token);
    loadUser(token).then(r => (r && setUserData(r)));
}
