import {escape, escapeAttr, apiFetch} from './utils.js';

async function loadWishlist() {
    const token = window.location.pathname.split("/").pop();
    const params = new URLSearchParams(window.location.search);
    const exchangeId = params.get("exchange");
    if (!token || !exchangeId) {
        redirectWithError("Invalid link");
        return;
    }

    await apiFetch(`/.netlify/functions/api-user-wishlist-get/${exchangeId}?token=${token}`, {
        onSuccess: (data) => {
            const spinner = document.getElementById("loading-spinner");
            if (spinner) spinner.remove();
            const heading = document.getElementById("heading");
            heading.textContent = `${data.recipientName}'s Wishlist`;
            heading.hidden = false;
            const content = document.getElementById("wishlist-content");

            if (data.wishlists.length === 0 && data.wishItems.length === 0) {
                content.textContent = "No wishlist submitted yet.";
                return;
            }

            let html = "";

            if (data.wishlists.length > 0) {
                html += "<h2>Wishlists</h2><ul>";
                data.wishlists.forEach(w => {
                    html += `<li><a href="${escapeAttr(w.url)}" target="_blank">${escape(w.title || w.url)}</a></li>`;
                });
                html += "</ul>";
            }

            if (data.wishItems.length > 0) {
                html += "<h2>Individual Items</h2><ul>";
                data.wishItems.forEach(item => {
                    const price = item.price ? ` <span class="item-price">${escape(item.price)}</span>` : '';
                    html += `<li><a href="${escapeAttr(item.url)}" target="_blank">${escape(item.title || item.url)}</a>${price}</li>`;
                });
                html += "</ul>";
            }

            content.innerHTML = html;
        },
        onError: (msg) => redirectWithError(msg),
    });
}

function redirectWithError(message) {
    sessionStorage.setItem("snackbarError", message);
    window.location.href = "/";
}

export function main() {
    loadWishlist();
}

