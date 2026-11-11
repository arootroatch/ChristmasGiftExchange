import * as snackbar from '../Snackbar.js';
import {escape, selectElement} from '../utils.js';

const SEARCH_DEBOUNCE_MS = 300;

function usersLayout() {
    return `
        <header class="admin-header">
            <h1>Users</h1>
            <span class="admin-header-badge">Admin</span>
        </header>
        <div class="admin-main">
            <div class="admin-toolbar">
                <input type="search" id="users-search" class="admin-users-search" placeholder="Search by name or email" aria-label="Search users">
            </div>
            <div id="users-container"></div>
        </div>`;
}

function countsCell({exchange, secretSanta, linkMode}) {
    return `<td title="Exchange · Secret Santa · Link">${exchange} · ${secretSanta} · ${linkMode}</td>`;
}

function userRow(user) {
    return `
        <tr>
            <td>${escape(user.name)}</td>
            <td>${escape(user.email)}</td>
            ${countsCell(user.organized)}
            ${countsCell(user.participant)}
            ${countsCell(user.total)}
            <td><button class="admin-btn admin-btn-inline" data-user-id="${escape(user._id)}" ${user.isAdmin ? 'disabled' : ''}>View as</button></td>
        </tr>`;
}

function usersTable(users) {
    if (users.length === 0) return '<div class="admin-empty">No users found.</div>';
    return `
        <div class="admin-table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Organized (Exchange · Secret Santa · Link)</th>
                        <th>Participant (Exchange · Secret Santa · Link)</th>
                        <th>Total (Exchange · Secret Santa · Link)</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>${users.map(userRow).join('')}</tbody>
            </table>
        </div>`;
}

async function viewAs(userId) {
    const res = await fetch('/.netlify/functions/api-admin-view-as-post', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({userId}),
    });
    if (!res.ok) {
        let message = 'Failed to view as user';
        try { message = (await res.json()).error || message; } catch { /* keep default */ }
        snackbar.showError(message);
        return;
    }
    window.location.href = '/dashboard';
}

async function loadUsers(q) {
    const target = selectElement('#users-container');
    const res = await fetch(`/.netlify/functions/api-admin-users-get?q=${encodeURIComponent(q)}`);
    if (res.status === 403) {
        target.innerHTML = '<div class="admin-empty">Access denied.</div>';
        return;
    }
    if (!res.ok) {
        snackbar.showError('Failed to load users');
        return;
    }
    const {users} = await res.json();
    target.innerHTML = usersTable(users);
}

export function render(container) {
    container.innerHTML = usersLayout();
    const input = selectElement('#users-search');
    let timer;
    input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => loadUsers(input.value.trim()), SEARCH_DEBOUNCE_MS);
    });
    selectElement('#users-container').addEventListener('click', (e) => {
        const button = e.target.closest('[data-user-id]');
        if (button && !button.disabled) viewAs(button.dataset.userId);
    });
    loadUsers('');
}
