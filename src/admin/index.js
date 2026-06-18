// src/admin/index.js
import '../../assets/styles/main.css';
import * as snackbar from '../Snackbar.js';
import * as cookieBanner from '../CookieBanner.js';
import {authGateTemplate, initAuthGate} from '../authGate.js';
import {loadSession} from '../session.js';
import {renderFilters, getFilterValues} from './logFilters.js';
import {renderTable} from './logTable.js';

function adminLayout() {
    return `
        <div style="max-width:1200px;margin:0 auto;padding:16px">
            <h1>Admin Logs</h1>
            <div id="filters-container"></div>
            <div id="logs-container"></div>
        </div>`;
}

async function loadLogs() {
    const {level, endpoint, from, to, page} = getFilterValues();
    const params = new URLSearchParams();
    if (level) params.set('level', level);
    if (endpoint) params.set('endpoint', endpoint);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    params.set('page', String(page));

    const res = await fetch(`/.netlify/functions/api-admin-logs-get?${params}`);
    if (res.status === 403) {
        document.getElementById('admin-content').innerHTML = '<p style="padding:16px">Access denied.</p>';
        return;
    }
    if (!res.ok) {
        snackbar.showError('Failed to load logs');
        return;
    }
    const data = await res.json();
    renderTable(data, loadLogs);
}

function initDashboard() {
    const content = document.getElementById('admin-content');
    content.innerHTML = adminLayout();
    renderFilters(document.getElementById('filters-container'), loadLogs);
    loadLogs();
}

function showAuthGate() {
    const content = document.getElementById('admin-content');
    content.innerHTML = authGateTemplate({heading: 'Admin Access'});
    initAuthGate({
        onSuccess: () => initDashboard(),
        onError: (msg) => snackbar.showError(msg),
    });
}

export async function main() {
    document.body.style.opacity = '1';
    snackbar.init();
    cookieBanner.init();
    const session = await loadSession();
    if (session) {
        initDashboard();
    } else {
        showAuthGate();
    }
}
