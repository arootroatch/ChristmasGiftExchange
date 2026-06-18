import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderFilters, getFilterValues, populateEndpoints} from '../../src/admin/logFilters.js';

describe('logFilters', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="filters-container"></div>';
    });

    it('renders endpoint as a select element', () => {
        renderFilters(document.getElementById('filters-container'), vi.fn());
        expect(document.getElementById('filter-endpoint').tagName).toBe('SELECT');
    });

    it('auto-searches when level select changes', () => {
        const onSearch = vi.fn();
        renderFilters(document.getElementById('filters-container'), onSearch);
        const select = document.getElementById('filter-level');
        select.value = 'error';
        select.dispatchEvent(new Event('change'));
        expect(onSearch).toHaveBeenCalledTimes(1);
    });

    it('populateEndpoints fills select with sorted options plus All option', () => {
        renderFilters(document.getElementById('filters-container'), vi.fn());
        populateEndpoints(['POST /api/auth', 'GET /api/user']);
        const select = document.getElementById('filter-endpoint');
        const values = Array.from(select.options).map(o => o.value);
        expect(values).toEqual(['', 'GET /api/user', 'POST /api/auth']);
    });

    it('populateEndpoints preserves current selection', () => {
        renderFilters(document.getElementById('filters-container'), vi.fn());
        populateEndpoints(['GET /api/user', 'POST /api/auth']);
        document.getElementById('filter-endpoint').value = 'GET /api/user';
        populateEndpoints(['GET /api/user', 'POST /api/auth', 'DELETE /api/user']);
        expect(document.getElementById('filter-endpoint').value).toBe('GET /api/user');
    });

    it('getFilterValues reads endpoint select value', () => {
        renderFilters(document.getElementById('filters-container'), vi.fn());
        populateEndpoints(['GET /api/user']);
        document.getElementById('filter-endpoint').value = 'GET /api/user';
        expect(getFilterValues().endpoint).toBe('GET /api/user');
    });

    it('renders message text input', () => {
        renderFilters(document.getElementById('filters-container'), vi.fn());
        expect(document.getElementById('filter-message')).not.toBeNull();
    });

    it('getFilterValues reads message text input value', () => {
        renderFilters(document.getElementById('filters-container'), vi.fn());
        document.getElementById('filter-message').value = 'Exchange created';
        expect(getFilterValues().message).toBe('Exchange created');
    });
});
