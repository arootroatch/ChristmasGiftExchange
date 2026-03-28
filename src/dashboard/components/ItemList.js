import {dashboardEvents, DashboardEvents, addItem, deleteItem, setCurrency} from '../state.js';
import {escape, escapeAttr, selectElement, addEventListener} from '../../utils.js';
import {showError} from '../../Snackbar.js';
import {formatPrice, toSmallestUnit, currencyDecimals} from '../formatPrice.js';
import btnStyles from '../../../assets/styles/dashboard/components/buttons.module.css';
import cardStyles from '../../../assets/styles/dashboard/components/cards.module.css';
import wishStyles from '../../../assets/styles/dashboard/components/wishlist.module.css';

const CURRENCIES = [
    {code: 'USD', label: '$ USD'},
    {code: 'EUR', label: '€ EUR'},
    {code: 'GBP', label: '£ GBP'},
    {code: 'CAD', label: '$ CAD'},
    {code: 'AUD', label: '$ AUD'},
    {code: 'JPY', label: '¥ JPY'},
];

function template(currency) {
    const decimals = currencyDecimals(currency);
    const step = decimals === 0 ? '1' : '0.01';
    const placeholder = decimals === 0 ? '2500' : '25.00';

    return `<section id="items-section" class="${cardStyles.card}">
        <h2>Individual Items</h2>
        <p class="helper-text">Add links to specific products you'd like</p>
        <div id="currency-row">
            <label for="item-currency">Currency</label>
            <select id="item-currency">
                ${CURRENCIES.map(c =>
                    `<option value="${c.code}"${c.code === currency ? ' selected' : ''}>${c.label}</option>`
                ).join('')}
            </select>
        </div>
        <div id="items-list"></div>
        <div id="add-item-form" class="${wishStyles.addForm} ${wishStyles.addFormItems}">
            <div class="${wishStyles.itemFormUrl}">
                <label for="item-url">Product URL</label>
                <input type="url" id="item-url" placeholder="https://amazon.com/dp/..."/>
            </div>
            <div>
                <label for="item-title">Title</label>
                <input type="text" id="item-title" placeholder="Bluetooth Headphones"/>
            </div>
            <div>
                <label for="item-price">Price</label>
                <input type="number" id="item-price" class="${wishStyles.itemPriceInput}" min="0" step="${step}" placeholder="${placeholder}"/>
            </div>
            <button id="add-item-btn" class="${btnStyles.button}">Add</button>
        </div>
    </section>`;
}

const entryTemplate = (url, title, price, currency, index) => `
    <div class="${wishStyles.wishlistEntry}">
        <a href="${escapeAttr(url)}" target="_blank">${escape(title)}</a>
        ${price ? `<span class="${wishStyles.itemPrice}">${formatPrice(price, currency)}</span>` : ''}
        <button class="delete-btn" data-type="wishItems" data-index="${index}">X</button>
    </div>`;

let currentCurrency = 'USD';

export function init() {
    selectElement('[data-slot="items"]').innerHTML = template('USD');
    dashboardEvents.on(DashboardEvents.USER_LOADED, onDataLoaded);
    dashboardEvents.on(DashboardEvents.ITEMS_CHANGED, render);
    addEventListener("#add-item-btn", "click", handleAdd);
    addEventListener("#items-list", "click", handleDelete);
    addEventListener("#item-currency", "change", handleCurrencyChange);
}

function onDataLoaded(state) {
    currentCurrency = state.user.currency || 'USD';
    selectElement('[data-slot="items"]').innerHTML = template(currentCurrency);
    addEventListener("#add-item-btn", "click", handleAdd);
    addEventListener("#items-list", "click", handleDelete);
    addEventListener("#item-currency", "change", handleCurrencyChange);
    render(state);
}

function render({user}) {
    currentCurrency = user.currency || 'USD';
    selectElement("#items-list").innerHTML = user.wishItems.map((item, i) =>
        entryTemplate(item.url, item.title, item.price, currentCurrency, i)
    ).join("");
    updatePriceInput();
}

function updatePriceInput() {
    const priceInput = selectElement("#item-price");
    if (!priceInput) return;
    const decimals = currencyDecimals(currentCurrency);
    priceInput.step = decimals === 0 ? '1' : '0.01';
    priceInput.placeholder = decimals === 0 ? '2500' : '25.00';
}

function handleCurrencyChange() {
    const code = selectElement("#item-currency").value;
    setCurrency(code);
}

function handleAdd() {
    const url = selectElement("#item-url").value.trim();
    const title = selectElement("#item-title").value.trim();
    const priceStr = selectElement("#item-price").value.trim();

    if (!url || !title) {
        showError("Please enter a URL and title");
        return;
    }

    try {
        new URL(url);
    } catch {
        showError("Please enter a valid URL");
        return;
    }

    let price = 0;
    if (priceStr) {
        const parsed = parseFloat(priceStr);
        if (isNaN(parsed) || parsed < 0) {
            showError("Please enter a valid price");
            return;
        }
        const decimals = currencyDecimals(currentCurrency);
        const parts = priceStr.split('.');
        if (decimals === 0 && parts.length > 1) {
            showError("Please enter a whole number for this currency");
            return;
        }
        if (decimals > 0 && parts.length > 1 && parts[1].length > decimals) {
            showError("Please enter a valid price");
            return;
        }
        price = toSmallestUnit(parsed, currentCurrency);
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
