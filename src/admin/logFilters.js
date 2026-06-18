// src/admin/logFilters.js
let currentPage = 1;
let onSearchFn;

export function renderFilters(container, onSearch) {
    onSearchFn = onSearch;
    container.innerHTML = `
        <div class="admin-filters" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            <select id="filter-level">
                <option value="">All levels</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
                <option value="debug">Debug</option>
            </select>
            <select id="filter-endpoint"><option value="">All endpoints</option></select>
            <label>From <input type="datetime-local" id="filter-from"></label>
            <label>To <input type="datetime-local" id="filter-to"></label>
            <button id="filter-search">Search</button>
        </div>`;
    document.getElementById('filter-level').addEventListener('change', () => {
        currentPage = 1;
        onSearchFn();
    });
    document.getElementById('filter-endpoint').addEventListener('change', () => {
        currentPage = 1;
        onSearchFn();
    });
    document.getElementById('filter-search').addEventListener('click', () => {
        currentPage = 1;
        onSearchFn();
    });
}

export function populateEndpoints(endpoints) {
    const select = document.getElementById('filter-endpoint');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">All endpoints</option>' +
        [...endpoints].sort().map(ep =>
            `<option value="${ep}"${ep === current ? ' selected' : ''}>${ep}</option>`
        ).join('');
}

export function getFilterValues() {
    const fromRaw = document.getElementById('filter-from')?.value;
    const toRaw = document.getElementById('filter-to')?.value;
    return {
        level: document.getElementById('filter-level')?.value || '',
        endpoint: document.getElementById('filter-endpoint')?.value || '',
        from: fromRaw ? new Date(fromRaw).toISOString() : '',
        to: toRaw ? new Date(toRaw).toISOString() : '',
        page: currentPage,
    };
}

export function setPage(page) {
    currentPage = page;
}
