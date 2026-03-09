import {addEventListener, selectElement} from '../../utils.js';
import * as snackbar from '../../Snackbar.js';

function template() {
    return `<section id="contact-section">
        <h2>Send Contact Info to Your Secret Santa</h2>
        <p class="helper-text">This information will be emailed directly to your Secret Santa and will NOT be stored.</p>
        <label for="contact-address">Shipping Address</label>
        <textarea id="contact-address" rows="3" placeholder="Your shipping address"></textarea>
        <label for="contact-phone">Phone Number</label>
        <input type="tel" id="contact-phone" placeholder="Your phone number"/>
        <label for="contact-notes">Notes</label>
        <textarea id="contact-notes" rows="2" placeholder="Anything else they should know"></textarea>
        <button id="send-contact-btn" class="button">Send to My Secret Santa</button>
    </section>`;
}

export function init(token) {
    selectElement('[data-slot="contact"]').innerHTML = template();
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

    const btn = selectElement("#send-contact-btn");
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
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
            const body = await response.json();
            snackbar.showError(body.error || "Failed to send contact info");
        }
    } catch (error) {
        snackbar.showError("Something went wrong. Please try again.");
    } finally {
        btn.disabled = false;
        btn.textContent = "Send to My Secret Santa";
    }
}
