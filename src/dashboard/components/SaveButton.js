import {dashboardEvents, DashboardEvents, markClean} from '../state.js';
import {addEventListener, selectElement, apiFetch} from '../../utils.js';
import * as snackbar from '../../Snackbar.js';
import btnStyles from '../../../assets/styles/dashboard/components/buttons.module.css';

function template() {
    return `<button id="save-wishlist-btn" class="${btnStyles.button} ${btnStyles.primary}" disabled>Save Wishlist</button>`;
}

export function init() {
    selectElement('[data-slot="save"]').innerHTML = template();
    let userData;
    const updateUserData = (state) => { userData = state.user; };
    dashboardEvents.on(DashboardEvents.USER_LOADED, updateUserData);
    dashboardEvents.on(DashboardEvents.WISHLISTS_CHANGED, updateUserData);
    dashboardEvents.on(DashboardEvents.ITEMS_CHANGED, updateUserData);
    dashboardEvents.on(DashboardEvents.DIRTY_CHANGED, ({dirty}) => {
        selectElement("#save-wishlist-btn").disabled = !dirty;
    });
    addEventListener("#save-wishlist-btn", "click", () => save(userData));
}

async function save({wishlists, wishItems, currency}) {
    const btn = selectElement("#save-wishlist-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    await apiFetch("/.netlify/functions/api-user-wishlist-put", {
        method: "PUT",
        body: {wishlists, wishItems, currency},
        onSuccess: () => {
            markClean();
            snackbar.showSuccess("Wishlist saved!");
        },
        onError: (msg) => {
            btn.disabled = false;
            snackbar.showError(msg);
        },
        fallbackMessage: "Failed to save wishlist. Please try again.",
    });

    btn.textContent = "Save Wishlist";
}
