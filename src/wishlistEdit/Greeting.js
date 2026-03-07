import {wishlistEditEvents, WishlistEditEvents} from './state.js';
import {selectElement} from '../utils.js';

export function init() {
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, render);
}

function render({userName}) {
    selectElement("#greeting").textContent = `Hi ${userName}, add your wishlist!`;
}
