// src/admin/logTable.js
import {setPage} from './logFilters.js';

const LEVEL_STYLES = {
    info: 'background:#dbeafe;color:#1d4ed8',
    warn: 'background:#fef3c7;color:#92400e',
    error: 'background:#fee2e2;color:#991b1b',
    debug: 'background:#f3f4f6;color:#374151',
};

function escapeHtml(str) {
    return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function renderTable({logs, total, page, pages}, onPageChange) {
    const container = document.getElementById('logs-container');

    if (!logs.length) {
        container.innerHTML = '<p>No logs found.</p>';
        return;
    }

    const rows = logs.map(log => `
        <tr>
            <td style="white-space:nowrap">${new Date(log.timestamp).toLocaleString()}</td>
            <td><span style="padding:2px 6px;border-radius:4px;font-size:12px;${LEVEL_STYLES[log.level] || ''}">${escapeHtml(log.level)}</span></td>
            <td>${escapeHtml(log.message)}</td>
            <td style="font-size:12px">${escapeHtml(log.endpoint)}</td>
            <td style="font-size:12px">${escapeHtml(log.ip)}</td>
            <td><details><summary style="cursor:pointer;font-size:12px">view</summary><pre style="font-size:11px;max-width:300px;overflow:auto">${escapeHtml(JSON.stringify(log.metadata, null, 2))}</pre></details></td>
        </tr>`).join('');

    container.innerHTML = `
        <p style="margin-bottom:8px">Showing ${logs.length} of ${total} logs</p>
        <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                    <tr style="background:#f9fafb;text-align:left">
                        <th style="padding:8px;border-bottom:1px solid #e5e7eb">Timestamp</th>
                        <th style="padding:8px;border-bottom:1px solid #e5e7eb">Level</th>
                        <th style="padding:8px;border-bottom:1px solid #e5e7eb">Message</th>
                        <th style="padding:8px;border-bottom:1px solid #e5e7eb">Endpoint</th>
                        <th style="padding:8px;border-bottom:1px solid #e5e7eb">IP</th>
                        <th style="padding:8px;border-bottom:1px solid #e5e7eb">Metadata</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.replace(/<tr>/g, '<tr style="border-bottom:1px solid #f3f4f6">').replace(/<td/g, '<td style="padding:8px;vertical-align:top"')}
                </tbody>
            </table>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:12px">
            ${page > 1 ? `<button id="page-prev">Previous</button>` : '<span></span>'}
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
