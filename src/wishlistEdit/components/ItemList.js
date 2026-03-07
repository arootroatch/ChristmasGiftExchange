import {wishlistEditEvents, WishlistEditEvents, addItem, deleteItem} from '../state.js';
import {escape, escapeAttr, selectElement, addEventListener} from '../../utils.js';

const entryTemplate = (url, title, index) => `
    <div class="wishlist-entry">
        <a href="${escapeAttr(url)}" target="_blank">${escape(title || url)}</a>
        <button class="delete-btn" data-type="wishItems" data-index="${index}">X</button>
    </div>`;

export function init() {
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, render);
    wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, render);
    addEventListener("#add-item-btn", "click", handleAdd);
    addEventListener("#items-list", "click", handleDelete);
}

function render({userData}) {
    selectElement("#items-list").innerHTML = userData.wishItems.map((item, i) =>
        entryTemplate(item.url, item.title, i)
    ).join("");
}

function handleAdd() {
    const url = selectElement("#item-url").value.trim();
    const title = selectElement("#item-title").value.trim();
    if (!url) return;
    addItem({url, title: title || url});
    selectElement("#item-url").value = "";
    selectElement("#item-title").value = "";
}

function handleDelete(event) {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;
    deleteItem(parseInt(btn.dataset.index));
}
