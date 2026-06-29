// src/admin/logTable.js
import {setPage} from './logFilters.js';
import {addEventListener, selectElement} from '../utils.js';

function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hasMetadata(log) {
    return log.metadata && Object.keys(log.metadata).length > 0;
}

function buildRows(logs) {
    return logs.map((log, i) => {
        const meta = hasMetadata(log)
            ? JSON.stringify(log.metadata, null, 2).replace(/\\n/g, '\n')
            : null;
        return `
            <tr class="log-row">
                <td class="col-time">${new Date(log.timestamp).toLocaleString()}</td>
                <td class="col-level"><span class="level-badge level-${escapeHtml(log.level)}">${escapeHtml(log.level)}</span></td>
                <td class="col-message">${escapeHtml(log.message)}</td>
                <td class="col-endpoint">${escapeHtml(log.endpoint)}</td>
                <td class="col-ip">${escapeHtml(log.ip)}</td>
                <td class="col-expand">${meta ? `<button class="meta-toggle" data-row="${i}" aria-expanded="false">▶</button>` : ''}</td>
            </tr>
            ${meta ? `<tr class="log-meta-row" id="log-meta-${i}" hidden>
                <td colspan="6" class="col-meta-content"><pre>${escapeHtml(meta)}</pre></td>
            </tr>` : ''}`;
    }).join('');
}

export function renderTable({logs, total, page, pages}, onPageChange) {
    const container = selectElement('#logs-container');

    if (!logs.length) {
        container.innerHTML = '<div class="admin-empty">No logs found.</div>';
        return;
    }

    container.innerHTML = `
        <p class="admin-table-summary">Showing ${logs.length} of ${total} logs</p>
        <div class="admin-table-wrap">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Timestamp</th>
                        <th>Level</th>
                        <th>Message</th>
                        <th>Endpoint</th>
                        <th>IP</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>${buildRows(logs)}</tbody>
            </table>
        </div>
        <div class="admin-pagination">
            ${page > 1 ? `<button id="page-prev">Previous</button>` : ''}
            <span>Page ${page} of ${Math.max(1, pages)}</span>
            ${page < pages ? `<button id="page-next">Next</button>` : ''}
        </div>`;

    container.querySelector('tbody').addEventListener('click', e => {
        const btn = e.target.closest('.meta-toggle');
        if (!btn) return;
        const idx = btn.dataset.row;
        const metaRow = selectElement(`#log-meta-${idx}`);
        const open = btn.getAttribute('aria-expanded') === 'true';
        metaRow.hidden = open;
        btn.setAttribute('aria-expanded', String(!open));
        btn.textContent = open ? '▶' : '▼';
    });

    addEventListener('#page-prev', 'click', () => {
        setPage(page - 1);
        onPageChange();
    });
    addEventListener('#page-next', 'click', () => {
        setPage(page + 1);
        onPageChange();
    });
}
