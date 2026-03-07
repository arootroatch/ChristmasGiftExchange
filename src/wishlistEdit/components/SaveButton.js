import {wishlistEditEvents, WishlistEditEvents} from '../state.js';
import {addEventListener, selectElement} from '../../utils.js';
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
