import {describe, it, expect, vi, beforeEach} from 'vitest';
import * as snackbar from '../../src/Snackbar.js';
import {render} from '../../src/admin/logsSection.js';

const json = (body, ok = true, status = 200) => ({ok, status, json: async () => body});

describe('logsSection', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="section-logs"></div>';
        snackbar.init();
    });

    it('renders filters and loads logs', async () => {
        global.fetch = vi.fn((url) => Promise.resolve(url.includes('api-admin-logs-get')
            ? json({logs: [], distinctEndpoints: ['api-x'], page: 1, totalPages: 1, total: 0})
            : json({logLevel: 'warn'})));
        render(document.getElementById('section-logs'));
        expect(document.getElementById('filters-container')).not.toBeNull();
        expect(document.getElementById('log-level-container')).not.toBeNull();
        await vi.waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/.netlify/functions/api-admin-logs-get?'));
        });
    });

    it('shows Access denied inside the section on 403', async () => {
        // let the log-level control finish loading before the 403 replaces the section
        global.fetch = vi.fn((url) => url.includes('api-admin-logs-get')
            ? new Promise(r => setTimeout(() => r(json({}, false, 403)), 20))
            : Promise.resolve(json({logLevel: 'warn'})));
        render(document.getElementById('section-logs'));
        await vi.waitFor(() => {
            expect(document.getElementById('section-logs').textContent).toContain('Access denied.');
        });
    });
});
