import {escape, escapeAttr, apiFetch} from './utils.js';
import * as snackbar from './Snackbar.js';
import * as cookieBanner from './CookieBanner.js';
import {authGateTemplate, initAuthGate} from './authGate.js';

function getExchangeId() {
    return new URLSearchParams(window.location.search).get("exchange");
}

function hasLegacyToken() {
    return new URLSearchParams(window.location.search).has("user");
}

function showAuthGate(message) {
    const spinner = document.getElementById("loading-spinner");
    if (spinner) spinner.remove();
    const container = document.getElementById("container");
    container.innerHTML = `
        ${message ? `<p class="auth-message">${message}</p>` : ''}
        ${authGateTemplate()}
    `;
    initAuthGate({
        onSuccess: () => {
            container.innerHTML = pageSlots();
            loadWishlist();
        },
        onError: (msg) => snackbar.showError(msg),
    });
}

function pageSlots() {
    return `
    <div id="loading-spinner" class="spinner-container"><div class="spinner"></div></div>
    <h1 id="heading" hidden></h1>
    <div id="wishlist-content"></div>`;
}

function renderWishlist(data) {
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
}

async function loadWishlist() {
    const exchangeId = getExchangeId();
    if (!exchangeId) {
        redirectWithError("Invalid link");
        return;
    }

    await apiFetch(`/.netlify/functions/api-user-wishlist-get?exchangeId=${encodeURIComponent(exchangeId)}`, {
        method: "GET",
        onSuccess: (data) => renderWishlist(data),
        onError: (msg) => {
            showAuthGate();
        },
    });
}

function redirectWithError(message) {
    sessionStorage.setItem("snackbarError", message);
    window.location.href = "/";
}

export function main() {
    snackbar.init();
    cookieBanner.init();

    if (hasLegacyToken()) {
        showAuthGate("This link has expired. Enter your email to get a new verification code.");
        return;
    }

    loadWishlist();
}
