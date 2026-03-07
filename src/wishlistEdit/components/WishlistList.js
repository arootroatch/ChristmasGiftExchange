import {wishlistEditEvents, WishlistEditEvents, addWishlist, deleteWishlist} from '../state.js';
import {escape, escapeAttr, selectElement, addEventListener} from '../../utils.js';

function template() {
    return `<section id="wishlists-section">
        <h2>External Wishlists</h2>
        <p class="helper-text">Add links to your Amazon, Wishlist.com, or other wishlists</p>
        <div id="wishlists-list"></div>
        <div id="add-wishlist-form">
            <input type="url" id="wishlist-url" placeholder="Wishlist URL"/>
            <input type="text" id="wishlist-title" placeholder="Title (optional)"/>
            <button id="add-wishlist-btn" class="button">Add</button>
        </div>
    </section>`;
}

const entryTemplate = (url, title, index) => `
    <div class="wishlist-entry">
        <a href="${escapeAttr(url)}" target="_blank">${escape(title || url)}</a>
        <button class="delete-btn" data-type="wishlists" data-index="${index}">X</button>
    </div>`;

export function init() {
    selectElement('[data-slot="wishlists"]').innerHTML = template();
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, render);
    wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, render);
    addEventListener("#add-wishlist-btn", "click", handleAdd);
    addEventListener("#wishlists-list", "click", handleDelete);
}

function render({userData}) {
    selectElement("#wishlists-list").innerHTML = userData.wishlists.map((w, i) =>
        entryTemplate(w.url, w.title, i)
    ).join("");
}

function handleAdd() {
    const url = selectElement("#wishlist-url").value.trim();
    const title = selectElement("#wishlist-title").value.trim();
    if (!url) return;
    addWishlist({url, title: title || url});
    selectElement("#wishlist-url").value = "";
    selectElement("#wishlist-title").value = "";
}

function handleDelete(event) {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;
    deleteWishlist(parseInt(btn.dataset.index));
}
