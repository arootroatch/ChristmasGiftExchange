import * as snackbar from '../Snackbar.js';
import {renderFilters, getFilterValues, populateEndpoints} from './logFilters.js';
import {renderTable} from './logTable.js';
import {renderLogLevelControl} from './logLevelControl.js';
import {selectElement} from '../utils.js';

function logsLayout() {
    return `
        <header class="admin-header">
            <h1>Admin Logs</h1>
            <span class="admin-header-badge">Admin</span>
        </header>
        <div class="admin-main">
            <div class="admin-toolbar">
                <div id="filters-container"></div>
                <div id="log-level-container"></div>
            </div>
            <div id="logs-container"></div>
        </div>`;
}

async function loadLogs() {
    const {level, endpoint, message, from, to, page} = getFilterValues();
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    if (endpoint) params.set('endpoint', endpoint);
    if (message) params.set('message', message);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('page', String(page));

    const res = await fetch(`/.netlify/functions/api-admin-logs-get?${params}`);
    if (res.status === 403) {
        selectElement('#section-logs').innerHTML = '<div class="admin-empty">Access denied.</div>';
        return;
    }
    if (!res.ok) {
        snackbar.showError('Failed to load logs');
        return;
    }
    const data = await res.json();
    renderTable(data, loadLogs);
    populateEndpoints(data.distinctEndpoints || []);
}

export function render(container) {
    container.innerHTML = logsLayout();
    renderLogLevelControl(selectElement('#log-level-container'));
    renderFilters(selectElement('#filters-container'), loadLogs);
    loadLogs();
}
