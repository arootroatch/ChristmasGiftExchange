// src/admin/logFilters.js
import {addEventListener, selectElement} from '../utils.js';

let currentPage = 1;
let onSearchFn;

export function renderFilters(container, onSearch) {
    onSearchFn = onSearch;
    container.innerHTML = `
        <div class="admin-filters">
            <div class="admin-filter-group">
                <label for="filter-level">Level</label>
                <select id="filter-level">
                    <option value="">All levels</option>
                    <option value="info">Info</option>
                    <option value="warn">Warn</option>
                    <option value="error">Error</option>
                    <option value="debug">Debug</option>
                </select>
            </div>
            <div class="admin-filter-group">
                <label for="filter-endpoint">Endpoint</label>
                <select id="filter-endpoint"><option value="">All endpoints</option></select>
            </div>
            <div class="admin-filter-group">
                <label for="filter-message">Message</label>
                <input type="text" id="filter-message" placeholder="Search message...">
            </div>
            <div class="admin-filter-group">
                <label for="filter-from">From</label>
                <input type="datetime-local" id="filter-from">
            </div>
            <div class="admin-filter-group">
                <label for="filter-to">To</label>
                <input type="datetime-local" id="filter-to">
            </div>
            <div class="admin-filter-group admin-filter-action">
                <span aria-hidden="true"></span>
                <button id="filter-search" class="admin-btn admin-btn-inline">Search</button>
            </div>
        </div>`;
    addEventListener('#filter-level', 'change', () => {
        currentPage = 1;
        onSearchFn();
    });
    addEventListener('#filter-endpoint', 'change', () => {
        currentPage = 1;
        onSearchFn();
    });
    addEventListener('#filter-search', 'click', () => {
        currentPage = 1;
        onSearchFn();
    });
}

export function populateEndpoints(endpoints) {
    const select = selectElement('#filter-endpoint');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">All endpoints</option>' +
        [...endpoints].sort().map(ep =>
            `<option value="${ep}"${ep === current ? ' selected' : ''}>${ep}</option>`
        ).join('');
}

export function getFilterValues() {
    const fromRaw = selectElement('#filter-from')?.value;
    const toRaw = selectElement('#filter-to')?.value;
    return {
        level: selectElement('#filter-level')?.value || '',
        endpoint: selectElement('#filter-endpoint')?.value || '',
        message: selectElement('#filter-message')?.value || '',
        from: fromRaw ? new Date(fromRaw).toISOString() : '',
        to: toRaw ? new Date(toRaw).toISOString() : '',
        page: currentPage,
    };
}

export function setPage(page) {
    currentPage = page;
}
