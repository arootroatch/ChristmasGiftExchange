import {escape, escapeAttr, selectElement, addEventListener} from '../utils.js';
import * as snackbar from '../components/Snackbar.js';
import {
  wishlistEditEvents,
  WishlistEditEvents,
  setUserData,
  addWishlist,
  deleteWishlist,
  addItem,
  deleteItem,
} from '../wishlistEditState.js';

let cachedUserData;

function cacheUserData({userData}) {
    cachedUserData = userData;
}

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

function renderWishlists({userData}) {
    selectElement("#wishlists-list").innerHTML = userData.wishlists.map((w, i) => `
        <div class="wishlist-entry">
            <a href="${escapeAttr(w.url)}" target="_blank">${escape(w.title || w.url)}</a>
            <button class="delete-btn" data-type="wishlists" data-index="${i}">X</button>
        </div>
    `).join("");
}

function renderItems({userData}) {
    selectElement("#items-list").innerHTML = userData.wishItems.map((item, i) => `
        <div class="wishlist-entry">
            <a href="${escapeAttr(item.url)}" target="_blank">${escape(item.title || item.url)}</a>
            <button class="delete-btn" data-type="wishItems" data-index="${i}">X</button>
        </div>
    `).join("");
}

function onUserLoaded({userName, userData}) {
    selectElement("#greeting").textContent = `Hi ${userName}, add your wishlist!`;
    renderWishlists({userData});
    renderItems({userData});
}

function handleAddWishlist() {
    const url = selectElement("#wishlist-url").value.trim();
    const title = selectElement("#wishlist-title").value.trim();
    if (!url) return;
    addWishlist({url, title: title || url});
    selectElement("#wishlist-url").value = "";
    selectElement("#wishlist-title").value = "";
}

function handleAddItem() {
    const url = selectElement("#item-url").value.trim();
    const title = selectElement("#item-title").value.trim();
    if (!url) return;
    addItem({url, title: title || url});
    selectElement("#item-url").value = "";
    selectElement("#item-title").value = "";
}

function handleDeleteEntry(event) {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;
    const type = btn.dataset.type;
    const index = parseInt(btn.dataset.index);
    type === "wishlists" ? deleteWishlist(index) : deleteItem(index);
}

async function saveWishlist(token) {
    const response = await fetch(`/.netlify/functions/api-user-wishlist-put/${token}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            wishlists: cachedUserData.wishlists,
            wishItems: cachedUserData.wishItems,
        }),
    });
    if (response.ok) {
        snackbar.showSuccess("Wishlist saved!");
    } else {
        snackbar.showError("Failed to save wishlist");
    }
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
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, onUserLoaded);
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, cacheUserData);
    wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, renderWishlists);
    wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, cacheUserData);
    wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, renderItems);
    wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, cacheUserData);

    // Wire up DOM event listeners
    addEventListener("#add-wishlist-btn", "click", handleAddWishlist);
    addEventListener("#add-item-btn", "click", handleAddItem);
    addEventListener("#save-wishlist-btn", "click", () => saveWishlist(token));
    addEventListener("#send-contact-btn", "click", () => sendContactInfo(token));
    addEventListener("#wishlists-list", "click", handleDeleteEntry);
    addEventListener("#items-list", "click", handleDeleteEntry);

    loadUser(token);
}
