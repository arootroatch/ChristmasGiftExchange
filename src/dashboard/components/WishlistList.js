import {dashboardEvents, DashboardEvents, addWishlist, deleteWishlist} from '../state.js';
import {escape, escapeAttr, selectElement, addEventListener} from '../../utils.js';
import {showError} from '../../Snackbar.js';
import btnStyles from '../../../assets/styles/dashboard/components/buttons.module.css';
import cardStyles from '../../../assets/styles/dashboard/components/cards.module.css';
import wishStyles from '../../../assets/styles/dashboard/components/wishlist.module.css';

function template() {
    return `<section id="wishlists-section" class="${cardStyles.card}">
        <h2>External Wishlists</h2>
        <p class="helper-text">Add links to your Amazon, Wishlist.com, or other wishlists</p>
        <div id="wishlists-list"></div>
        <div id="add-wishlist-form" class="${wishStyles.addForm}">
            <div>
                <label for="wishlist-url">Wishlist URL</label>
                <input type="url" id="wishlist-url" placeholder="https://amazon.com/hz/wishlist/ls/..."/>
            </div>
            <div>
                <label for="wishlist-title">Title (optional)</label>
                <input type="text" id="wishlist-title" placeholder="My Amazon Wishlist"/>
            </div>
            <button id="add-wishlist-btn" class="${btnStyles.button}">Add</button>
        </div>
    </section>`;
}

const entryTemplate = (url, title, index) => `
    <div class="${wishStyles.wishlistEntry}">
        <a href="${escapeAttr(url)}" target="_blank">${escape(title || url)}</a>
        <button class="delete-btn" data-type="wishlists" data-index="${index}">X</button>
    </div>`;

export function init() {
    selectElement('[data-slot="wishlists"]').innerHTML = template();
    dashboardEvents.on(DashboardEvents.USER_LOADED, render);
    dashboardEvents.on(DashboardEvents.WISHLISTS_CHANGED, render);
    addEventListener("#add-wishlist-btn", "click", handleAdd);
    addEventListener("#wishlists-list", "click", handleDelete);
}

function render({user}) {
    selectElement("#wishlists-list").innerHTML = user.wishlists.map((w, i) =>
        entryTemplate(w.url, w.title, i)
    ).join("");
}

function handleAdd() {
    const url = selectElement("#wishlist-url").value.trim();
    const title = selectElement("#wishlist-title").value.trim();
    if (!url) return;
    try {
        new URL(url);
    } catch {
        showError("Please enter a valid URL");
        return;
    }
    addWishlist({url, title: title || url});
    selectElement("#wishlist-url").value = "";
    selectElement("#wishlist-title").value = "";
}

function handleDelete(event) {
    const btn = event.target.closest(".delete-btn");
    if (!btn) return;
    deleteWishlist(parseInt(btn.dataset.index));
}
