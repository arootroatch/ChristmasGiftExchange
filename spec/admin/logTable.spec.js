import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderTable} from '../../src/admin/logTable.js';

const sampleLog = {timestamp: new Date().toISOString(), level: 'info', message: 'Test', endpoint: null, ip: null};

describe('logTable', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="logs-container"></div>';
    });

    it('renders the active date range in the summary line', () => {
        renderTable({
            logs: [sampleLog],
            total: 1,
            page: 1,
            pages: 1,
            range: {from: '2026-07-15T14:00:00.000Z', to: '2026-07-16T14:00:00.000Z'},
        }, vi.fn());
        const summary = document.querySelector('.admin-table-summary').textContent;
        expect(summary).toContain(new Date('2026-07-15T14:00:00.000Z').toLocaleString());
        expect(summary).toContain(new Date('2026-07-16T14:00:00.000Z').toLocaleString());
    });

    it('renders without range text when range is not provided', () => {
        renderTable({logs: [sampleLog], total: 1, page: 1, pages: 1}, vi.fn());
        expect(document.querySelector('.admin-table-summary').textContent).toBe('Showing 1 of 1 logs');
    });
});
