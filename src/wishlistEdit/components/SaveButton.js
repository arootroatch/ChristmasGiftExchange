import {wishlistEditEvents, WishlistEditEvents} from '../state.js';
import {addEventListener, selectElement, apiFetch} from '../../utils.js';
import * as snackbar from '../../Snackbar.js';

let cachedUserData;

function template() {
    return '<button id="save-wishlist-btn" class="button primary">Save Wishlist</button>';
}

function cacheUserData({userData}) {
    cachedUserData = userData;
}

export function init(token) {
    selectElement('[data-slot="save"]').innerHTML = template();
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, cacheUserData);
    wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, cacheUserData);
    wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, cacheUserData);
    addEventListener("#save-wishlist-btn", "click", () => save(token));
}

async function save(token) {
    const btn = selectElement("#save-wishlist-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    await apiFetch(`/.netlify/functions/api-user-wishlist-put/${token}`, {
        method: "PUT",
        body: {
            wishlists: cachedUserData.wishlists,
            wishItems: cachedUserData.wishItems,
        },
        onSuccess: () => snackbar.showSuccess("Wishlist saved!"),
        onError: (msg) => snackbar.showError(msg),
        fallbackMessage: "Failed to save wishlist. Please try again.",
    });

    btn.disabled = false;
    btn.textContent = "Save Wishlist";
}
