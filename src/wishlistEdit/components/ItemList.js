import {wishlistEditEvents, WishlistEditEvents, addItem, deleteItem} from '../state.js';
import {escape, escapeAttr, selectElement, addEventListener} from '../../utils.js';
import {showError} from '../../Snackbar.js';

function template() {
    return `<section id="items-section">
        <h2>Individual Items</h2>
        <p class="helper-text">Add links to specific products you'd like</p>
        <div id="items-list"></div>
        <div id="add-item-form">
            <div class="item-form-url">
                <label for="item-url">Product URL</label>
                <input type="url" id="item-url" placeholder="https://amazon.com/dp/..."/>
            </div>
            <div>
                <label for="item-title">Title</label>
                <input type="text" id="item-title" placeholder="Bluetooth Headphones"/>
            </div>
            <div>
                <label for="item-price">Price</label>
                <input type="text" id="item-price" placeholder="$25.00"/>
            </div>
            <button id="add-item-btn" class="button">Add</button>
        </div>
    </section>`;
}

const entryTemplate = (url, title, price, index) => `
    <div class="wishlist-entry">
        <a href="${escapeAttr(url)}" target="_blank">${escape(title)}</a>
        ${price ? `<span class="item-price">${escape(price)}</span>` : ''}
        <button class="delete-btn" data-type="wishItems" data-index="${index}">X</button>
    </div>`;

export function init() {
    selectElement('[data-slot="items"]').innerHTML = template();
    wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, render);
    wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, render);
    addEventListener("#add-item-btn", "click", handleAdd);
    addEventListener("#items-list", "click", handleDelete);
}

function render({userData}) {
    selectElement("#items-list").innerHTML = userData.wishItems.map((item, i) =>
        entryTemplate(item.url, item.title, item.price, i)
    ).join("");
}

function handleAdd() {
    const url = selectElement("#item-url").value.trim();
    const title = selectElement("#item-title").value.trim();
    const price = selectElement("#item-price").value.trim();
    if (!url || !title || !price) {
        showError("Please fill in all fields");
        return;
    }
    addItem({url, title, price});
    selectElement("#item-url").value = "";
    selectElement("#item-title").value = "";
    selectElement("#item-price").value = "";
}

function handleDelete(event) {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;
    deleteItem(parseInt(btn.dataset.index));
}
