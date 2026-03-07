import {escape, escapeAttr} from './utils.js';
import * as snackbar from './components/Snackbar.js';
import {
  wishlistEditEvents,
  WishlistEditEvents,
  wishlistEditState,
  setUserData,
  addWishlist,
  deleteWishlist,
  addItem,
  deleteItem,
} from './wishlistEditState.js';

const tokenMatch = window.location.pathname.match(/\/wishlist\/edit\/([^/]+)/);
const token = tokenMatch ? tokenMatch[1] : "";

function redirectWithError() {
    sessionStorage.setItem("snackbarError", "Invalid wishlist link");
    try { window.location.href = "/"; } catch (_) { /* JSDOM */ }
}

async function loadUser() {
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

function renderWishlists() {
    const container = document.getElementById("wishlists-list");
    container.innerHTML = wishlistEditState.userData.wishlists.map((w, i) => `
        <div class="wishlist-entry">
            <a href="${escapeAttr(w.url)}" target="_blank">${escape(w.title || w.url)}</a>
            <button class="delete-btn" data-type="wishlists" data-index="${i}">X</button>
        </div>
    `).join("");
}

function renderItems() {
    const container = document.getElementById("items-list");
    container.innerHTML = wishlistEditState.userData.wishItems.map((item, i) => `
        <div class="wishlist-entry">
            <a href="${escapeAttr(item.url)}" target="_blank">${escape(item.title || item.url)}</a>
            <button class="delete-btn" data-type="wishItems" data-index="${i}">X</button>
        </div>
    `).join("");
}

function onUserLoaded() {
    document.getElementById("greeting").textContent = `Hi ${wishlistEditState.userName}, add your wishlist!`;
    renderWishlists();
    renderItems();
}

function handleAddWishlist() {
    const url = document.getElementById("wishlist-url").value.trim();
    const title = document.getElementById("wishlist-title").value.trim();
    if (!url) return;
    addWishlist({url, title: title || url});
    document.getElementById("wishlist-url").value = "";
    document.getElementById("wishlist-title").value = "";
}

function handleAddItem() {
    const url = document.getElementById("item-url").value.trim();
    const title = document.getElementById("item-title").value.trim();
    if (!url) return;
    addItem({url, title: title || url});
    document.getElementById("item-url").value = "";
    document.getElementById("item-title").value = "";
}

function handleDeleteEntry(event) {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;
    const type = btn.dataset.type;
    const index = parseInt(btn.dataset.index);
    type === "wishlists" ? deleteWishlist(index) : deleteItem(index);
}

async function saveWishlist() {
    const response = await fetch(`/.netlify/functions/api-user-wishlist-put/${token}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            wishlists: wishlistEditState.userData.wishlists,
            wishItems: wishlistEditState.userData.wishItems,
        }),
    });
    if (response.ok) {
        snackbar.showSuccess("Wishlist saved!");
    } else {
        snackbar.showError("Failed to save wishlist");
    }
}

async function sendContactInfo() {
    const address = document.getElementById("contact-address").value.trim();
    const phone = document.getElementById("contact-phone").value.trim();
    const notes = document.getElementById("contact-notes").value.trim();

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
        document.getElementById("contact-address").value = "";
        document.getElementById("contact-phone").value = "";
        document.getElementById("contact-notes").value = "";
    } else {
        snackbar.showError("Failed to send contact info");
    }
}

// Subscribe to state events
wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, onUserLoaded);
wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, renderWishlists);
wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, renderItems);

// Wire up DOM event listeners
snackbar.init();
document.getElementById("add-wishlist-btn").addEventListener("click", handleAddWishlist);
document.getElementById("add-item-btn").addEventListener("click", handleAddItem);
document.getElementById("save-wishlist-btn").addEventListener("click", saveWishlist);
document.getElementById("send-contact-btn").addEventListener("click", sendContactInfo);
document.getElementById("wishlists-list").addEventListener("click", handleDeleteEntry);
document.getElementById("items-list").addEventListener("click", handleDeleteEntry);

loadUser();
