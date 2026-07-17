import {selectElement, addEventListener} from '../utils.js';
import * as snackbar from '../Snackbar.js';

export function renderLogLevelControl(container) {
    container.innerHTML = `
        <div class="admin-filters admin-log-level">
            <div class="admin-filter-row">
                <div class="admin-filter-group">
                    <label for="log-level-select">Log level</label>
                    <select id="log-level-select">
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warn</option>
                        <option value="error">Error</option>
                    </select>
                </div>
                <div class="admin-filter-group admin-filter-action">
                    <span aria-hidden="true"></span>
                    <button id="log-level-save" class="admin-btn admin-btn-inline">Save</button>
                </div>
            </div>
        </div>`;

    addEventListener('#log-level-save', 'click', saveLogLevel);
    loadLogLevel();
}

async function loadLogLevel() {
    const res = await fetch('/.netlify/functions/api-admin-settings-get');
    if (!res.ok) return;
    const {logLevel} = await res.json();
    selectElement('#log-level-select').value = logLevel;
}

async function saveLogLevel() {
    const logLevel = selectElement('#log-level-select').value;
    const res = await fetch('/.netlify/functions/api-admin-settings-put', {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({logLevel}),
    });
    if (!res.ok) {
        snackbar.showError('Failed to update log level');
        return;
    }
    snackbar.showSuccess('Log level updated');
}
