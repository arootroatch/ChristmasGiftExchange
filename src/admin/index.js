// src/admin/index.js
import '../../assets/styles/main.css';
import * as snackbar from '../Snackbar.js';
import {loadSession} from '../session.js';
import {renderFilters, getFilterValues, populateEndpoints} from './logFilters.js';
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
    populateEndpoints(data.distinctEndpoints || []);
}

function initDashboard() {
    const content = document.getElementById('admin-content');
    content.innerHTML = adminLayout();
    renderFilters(document.getElementById('filters-container'), loadLogs);
    loadLogs();
}

function adminGateTemplate() {
    return `
        <div id="admin-gate" style="max-width:400px;margin:60px auto;padding:24px">
            <h2>Admin Access</h2>
            <div id="admin-send-step">
                <p>Send a verification code to the admin email address.</p>
                <button id="admin-send-code">Send Verification Code</button>
            </div>
            <div id="admin-code-step" style="display:none">
                <p>Check your email for a verification code.</p>
                <label>Verification code<input type="text" id="admin-code" inputmode="numeric" maxlength="8" required></label>
                <button id="admin-verify-code">Verify</button>
            </div>
        </div>`;
}

function showAuthGate() {
    const content = document.getElementById('admin-content');
    content.innerHTML = adminGateTemplate();

    document.getElementById('admin-send-code').addEventListener('click', async () => {
        const btn = document.getElementById('admin-send-code');
        btn.disabled = true;
        const res = await fetch('/.netlify/functions/api-admin-code-post', {method: 'POST'});
        if (!res.ok) {
            btn.disabled = false;
            snackbar.showError('Failed to send code. Try again.');
            return;
        }
        document.getElementById('admin-send-step').style.display = 'none';
        document.getElementById('admin-code-step').style.display = '';
    });

    document.getElementById('admin-verify-code').addEventListener('click', async () => {
        const code = document.getElementById('admin-code').value.trim();
        if (!code) return;
        const btn = document.getElementById('admin-verify-code');
        btn.disabled = true;
        const res = await fetch('/.netlify/functions/api-admin-verify-post', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({code}),
        });
        if (!res.ok) {
            btn.disabled = false;
            snackbar.showError('Invalid code. Try again.');
            return;
        }
        initDashboard();
    });
}

export async function main() {
    document.body.style.opacity = '1';
    snackbar.init();
    try {
        const session = await loadSession();
        if (session) {
            initDashboard();
        } else {
            showAuthGate();
        }
    } catch {
        showAuthGate();
    }
}
