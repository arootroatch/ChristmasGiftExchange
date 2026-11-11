// src/admin/index.js
import '../../assets/styles/main.css';
import * as snackbar from '../Snackbar.js';
import {loadSession} from '../session.js';
import * as logsSection from './logsSection.js';
import * as usersSection from './usersSection.js';
import * as viewAsBanner from '../ViewAsBanner.js';
import {sectionFromPath, sidebarNavItemsTemplate, sectionContainersTemplate, initSidebarNav} from '../sidebarNav.js';
import {selectElement, addEventListener} from '../utils.js';

const SECTIONS = ['logs', 'users'];
const LABELS = {logs: 'Logs', users: 'Users'};
const RENDERERS = {logs: logsSection.render, users: usersSection.render};

function adminLayout() {
    const active = sectionFromPath(SECTIONS, 'logs');
    return `
        <div class="hamburger-bar">
            <button class="hamburger-btn" id="hamburger-btn" aria-label="Toggle menu">&#9776;</button>
            <span class="dashboard-welcome"><strong>Admin</strong> Portal</span>
        </div>
        <div class="sidebar-backdrop" id="sidebar-backdrop"></div>
        <div class="dashboard-layout">
            <nav class="dashboard-sidebar" id="dashboard-sidebar">
                <a class="sidebar-title" href="/"><img src="/favicon-32x32.png" alt="" width="24" height="24"> Gift Exchange Generator</a>
                <div class="sidebar-welcome"><strong>Admin</strong> Portal</div>
                <div class="sidebar-nav">
                    ${sidebarNavItemsTemplate(SECTIONS, LABELS, active)}
                    <a class="sidebar-back" href="/">Back to Exchange Generator</a>
                </div>
            </nav>
            <main class="dashboard-main admin-portal-main">
                ${sectionContainersTemplate(SECTIONS, active)}
            </main>
        </div>`;
}

function initDashboard() {
    selectElement('#admin-content').innerHTML = adminLayout();
    const rendered = new Set();
    initSidebarNav({
        sections: SECTIONS,
        basePath: '/admin',
        fallback: 'logs',
        onShow: (sectionId) => {
            if (rendered.has(sectionId)) return;
            rendered.add(sectionId);
            RENDERERS[sectionId]?.(selectElement(`#section-${sectionId}`));
        },
    });
}

function adminGateTemplate() {
    return `
        <div class="admin-gate">
            <div class="admin-gate-card">
                <h2>Admin Access</h2>
                <div id="admin-send-step">
                    <p>Send a verification code to the admin email address.</p>
                    <button id="admin-send-code" class="admin-btn">Send Verification Code</button>
                </div>
                <div id="admin-code-step" style="display:none">
                    <p>Check your email for a verification code.</p>
                    <label>Verification code
                        <input type="text" id="admin-code" inputmode="numeric" maxlength="8" required>
                    </label>
                    <button id="admin-verify-code" class="admin-btn">Verify</button>
                </div>
            </div>
        </div>`;
}

function showAuthGate() {
    const content = selectElement('#admin-content');
    content.innerHTML = adminGateTemplate();

    addEventListener('#admin-send-code', 'click', async () => {
        const btn = selectElement('#admin-send-code');
        btn.disabled = true;
        const res = await fetch('/.netlify/functions/api-admin-code-post', {method: 'POST'});
        if (!res.ok) {
            btn.disabled = false;
            snackbar.showError('Failed to send code. Try again.');
            return;
        }
        selectElement('#admin-send-step').style.display = 'none';
        selectElement('#admin-code-step').style.display = '';
    });

    addEventListener('#admin-verify-code', 'click', async () => {
        const code = selectElement('#admin-code').value.trim();
        if (!code) return;
        const btn = selectElement('#admin-verify-code');
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
        viewAsBanner.init();
        if (session) {
            initDashboard();
        } else {
            showAuthGate();
        }
    } catch {
        showAuthGate();
    }
}
