import {wishlistEditEvents, WishlistEditEvents} from '../state.js';
import {addEventListener, selectElement, apiFetch} from '../../utils.js';
import * as snackbar from '../../Snackbar.js';

function template() {
    return '<button id="save-wishlist-btn" class="button primary">Save Wishlist</button>';
}

export function init(token) {
    selectElement('[data-slot="save"]').innerHTML = template();
    let userData;
    const updateUserData = (state) => { userData = state.userData; };
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, updateUserData);
    wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, updateUserData);
    wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, updateUserData);
    addEventListener("#save-wishlist-btn", "click", () => save(token, userData));
}

async function save(token, {wishlists, wishItems}) {
    const btn = selectElement("#save-wishlist-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    await apiFetch(`/.netlify/functions/api-user-wishlist-put/${token}`, {
        method: "PUT",
        body: {wishlists, wishItems},
        onSuccess: () => snackbar.showSuccess("Wishlist saved!"),
        onError: (msg) => snackbar.showError(msg),
        fallbackMessage: "Failed to save wishlist. Please try again.",
    });

    btn.disabled = false;
    btn.textContent = "Save Wishlist";
}
