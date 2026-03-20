import {escape, escapeAttr, apiFetch} from './utils.js';
import * as cookieBanner from './CookieBanner.js';

async function loadWishlist() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("user");
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
                content.innerHTML = `<section style="text-align: center; margin-top: 24px;">
                    <p style="font-size: 1.1rem; color: rgba(255,255,255,0.9); margin: 0 0 8px;">
                        ${escape(data.recipientName)} hasn't added any wishlists yet.
                    </p>
                    <p style="color: rgba(255,255,255,0.6); margin: 0 0 4px;">
                        Check back later!
                    </p>
                    <p style="color: rgba(255,255,255,0.5); font-size: 0.9rem; margin: 0;">
                        We'll send you an email to let you know when they add any wishes.
                    </p>
                </section>`;
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
    cookieBanner.init();
    loadWishlist();
}

