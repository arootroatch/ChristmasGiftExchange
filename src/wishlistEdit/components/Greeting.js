import {wishlistEditEvents, WishlistEditEvents} from '../state.js';
import {selectElement} from '../../utils.js';

function template() {
    return '<div class="spinner-container"><div class="spinner"></div></div><h1 id="greeting" hidden></h1>';
}

export function init() {
    selectElement('[data-slot="greeting"]').innerHTML = template();
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, render);
}

function render({userName}) {
    const spinner = selectElement('[data-slot="greeting"] .spinner-container');
    if (spinner) spinner.remove();
    const greeting = selectElement("#greeting");
    greeting.textContent = `Hi ${userName}, add your wishlist!`;
    greeting.hidden = false;
}
