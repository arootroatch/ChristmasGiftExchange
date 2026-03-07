import {selectElement, addEventListener} from '../utils.js';
import * as snackbar from '../components/Snackbar.js';
import * as greeting from './Greeting.js';
import * as wishlistList from './WishlistList.js';
import * as itemList from './ItemList.js';
import * as saveButton from './SaveButton.js';
import {setUserData} from '../wishlistEditState.js';

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

async function sendContactInfo(token) {
    const address = selectElement("#contact-address").value.trim();
    const phone = selectElement("#contact-phone").value.trim();
    const notes = selectElement("#contact-notes").value.trim();

    if (!address && !phone && !notes) {
        snackbar.showError("Please fill in at least one field");
        return;
    }

    const response = await fetch(`/.netlify/functions/api-user-contact-post/${token}`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({address, phone, notes}),
    });

    if (response.ok) {
        snackbar.showSuccess("Contact info sent to your Secret Santa!");
        selectElement("#contact-address").value = "";
        selectElement("#contact-phone").value = "";
        selectElement("#contact-notes").value = "";
    } else {
        snackbar.showError("Failed to send contact info");
    }
}

export function main() {
    const token = extractToken();
    snackbar.init();

    // Subscribe to state events
    greeting.init();
    wishlistList.init();
    itemList.init();

    saveButton.init(token);

    // Wire up DOM event listeners
    addEventListener("#send-contact-btn", "click", () => sendContactInfo(token));

    loadUser(token);
}
