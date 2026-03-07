import {wishlistEditEvents, WishlistEditEvents} from '../state.js';
import {selectElement} from '../../utils.js';

function template() {
    return '<h1 id="greeting">Loading...</h1>';
}

export function init() {
    selectElement('[data-slot="greeting"]').innerHTML = template();
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, render);
}

function render({userName}) {
    selectElement("#greeting").textContent = `Hi ${userName}, add your wishlist!`;
}
