import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderLogLevelControl} from '../../src/admin/logLevelControl.js';
import * as snackbar from '../../src/Snackbar.js';

describe('logLevelControl', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="log-level-container"></div>';
        snackbar.init();
    });

    it('renders a select with all four log levels', () => {
        global.fetch = vi.fn().mockResolvedValue({ok: true, json: () => Promise.resolve({logLevel: 'warn'})});
        renderLogLevelControl(document.getElementById('log-level-container'));
        const select = document.getElementById('log-level-select');
        const values = Array.from(select.options).map(o => o.value);
        expect(values).toEqual(['debug', 'info', 'warn', 'error']);
    });

    it('loads and displays the current log level on render', async () => {
        global.fetch = vi.fn().mockResolvedValue({ok: true, json: () => Promise.resolve({logLevel: 'error'})});
        renderLogLevelControl(document.getElementById('log-level-container'));
        await vi.waitFor(() => {
            expect(document.getElementById('log-level-select').value).toBe('error');
        });
    });

    it('saves the selected level and shows a success snackbar', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ok: true, json: () => Promise.resolve({logLevel: 'warn'})})
            .mockResolvedValueOnce({ok: true, json: () => Promise.resolve({logLevel: 'error'})});
        renderLogLevelControl(document.getElementById('log-level-container'));
        await vi.waitFor(() => expect(document.getElementById('log-level-select').value).toBe('warn'));

        document.getElementById('log-level-select').value = 'error';
        document.getElementById('log-level-save').click();

        await vi.waitFor(() => {
            expect(document.getElementById('snackbar').textContent).toContain('Log level updated');
        });
        expect(global.fetch).toHaveBeenLastCalledWith('/.netlify/functions/api-admin-settings-put', {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({logLevel: 'error'}),
        });
    });

    it('shows an error snackbar when saving fails', async () => {
        global.fetch = vi.fn()
            .mockResolvedValueOnce({ok: true, json: () => Promise.resolve({logLevel: 'warn'})})
            .mockResolvedValueOnce({ok: false});
        renderLogLevelControl(document.getElementById('log-level-container'));
        await vi.waitFor(() => expect(document.getElementById('log-level-select').value).toBe('warn'));

        document.getElementById('log-level-save').click();

        await vi.waitFor(() => {
            expect(document.getElementById('snackbar').textContent).toContain('Failed to update log level');
        });
    });
});
