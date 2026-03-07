import {addEventListener, selectElement} from '../utils.js';
import * as snackbar from '../components/Snackbar.js';

export function init(token) {
    addEventListener("#send-contact-btn", "click", () => send(token));
}

async function send(token) {
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
