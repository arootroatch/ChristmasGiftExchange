// src/admin/logTable.js
import {setPage} from './logFilters.js';

function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderTable({logs, total, page, pages}, onPageChange) {
    const container = document.getElementById('logs-container');

    if (!logs.length) {
        container.innerHTML = '<div class="admin-empty">No logs found.</div>';
        return;
    }

    const rows = logs.map(log => `
        <tr>
            <td class="col-time">${new Date(log.timestamp).toLocaleString()}</td>
            <td><span class="level-badge level-${escapeHtml(log.level)}">${escapeHtml(log.level)}</span></td>
            <td>${escapeHtml(log.message)}</td>
            <td class="col-endpoint">${escapeHtml(log.endpoint)}</td>
            <td class="col-ip">${escapeHtml(log.ip)}</td>
            <td class="col-meta"><details><summary>view</summary><pre>${escapeHtml(JSON.stringify(log.metadata, null, 2).replace(/\\n/g, '\n'))}</pre></details></td>
        </tr>`).join('');

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
                        <th>Metadata</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        <div class="admin-pagination">
            ${page > 1 ? `<button id="page-prev">Previous</button>` : ''}
            <span>Page ${page} of ${Math.max(1, pages)}</span>
            ${page < pages ? `<button id="page-next">Next</button>` : ''}
        </div>`;

    document.getElementById('page-prev')?.addEventListener('click', () => {
        setPage(page - 1);
        onPageChange();
    });
    document.getElementById('page-next')?.addEventListener('click', () => {
        setPage(page + 1);
        onPageChange();
    });
}
