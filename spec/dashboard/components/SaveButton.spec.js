import {describe, it, expect, beforeEach, vi} from 'vitest';
import {JSDOM} from 'jsdom';
import {dashboardEvents, resetState, setUserData, addWishlist, markClean} from '../../../src/dashboard/state.js';
import {init} from '../../../src/dashboard/components/SaveButton.js';
import {init as initSnackbar} from '../../../src/Snackbar.js';

const flush = () => new Promise(r => setTimeout(r, 0));

function setupDOM() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="section-wishlist"><div data-slot="save"></div></div>
  </body></html>`, {url: 'http://localhost/dashboard'});

  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
}

function userData(overrides = {}) {
  return {name: 'Alice', email: 'a@test.com', wishlists: [], wishItems: [], currency: 'USD', ...overrides};
}

const successResponse = {ok: true, status: 200, json: async () => ({success: true})};
const errorResponse = {ok: false, status: 400, json: async () => ({error: 'Validation failed'})};

describe('SaveButton', () => {
  beforeEach(() => {
    setupDOM();
    dashboardEvents.clear();
    resetState();
    initSnackbar();
    init();
    globalThis.fetch = vi.fn(() => Promise.resolve(successResponse));
  });

  it('renders a disabled save button initially', () => {
    const btn = document.getElementById('save-wishlist-btn');
    expect(btn).not.toBeNull();
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toBe('Save Wishlist');
  });

  describe('dirty state', () => {
    it('enables button when state becomes dirty', () => {
      setUserData(userData());
      addWishlist({url: 'https://amazon.com/list', title: 'List'});

      expect(document.getElementById('save-wishlist-btn').disabled).toBe(false);
    });

    it('disables button when state is cleaned', () => {
      setUserData(userData());
      addWishlist({url: 'https://amazon.com/list', title: 'List'});
      markClean();

      expect(document.getElementById('save-wishlist-btn').disabled).toBe(true);
    });
  });

  describe('saving', () => {
    beforeEach(() => {
      setUserData(userData());
      addWishlist({url: 'https://amazon.com/list', title: 'List'});
    });

    it('calls api-user-wishlist-put with current data', async () => {
      document.getElementById('save-wishlist-btn').click();
      await flush();

      const call = globalThis.fetch.mock.calls[0];
      expect(call[0]).toContain('api-user-wishlist-put');
      const body = JSON.parse(call[1].body);
      expect(body.wishlists).toEqual([{url: 'https://amazon.com/list', title: 'List'}]);
      expect(body.currency).toBe('USD');
    });

    it('shows "Saving..." and disables button during request', () => {
      globalThis.fetch = vi.fn(() => new Promise(() => {})); // never resolves
      document.getElementById('save-wishlist-btn').click();

      const btn = document.getElementById('save-wishlist-btn');
      expect(btn.disabled).toBe(true);
      expect(btn.textContent).toBe('Saving...');
    });

    it('shows success snackbar and marks clean on success', async () => {
      document.getElementById('save-wishlist-btn').click();
      await flush();

      expect(document.getElementById('snackbar').textContent).toContain('Wishlist saved');
      expect(document.getElementById('save-wishlist-btn').disabled).toBe(true);
    });

    it('restores button text after successful save', async () => {
      document.getElementById('save-wishlist-btn').click();
      await flush();

      expect(document.getElementById('save-wishlist-btn').textContent).toBe('Save Wishlist');
    });

    it('shows error snackbar and re-enables button on failure', async () => {
      globalThis.fetch = vi.fn(() => Promise.resolve(errorResponse));
      document.getElementById('save-wishlist-btn').click();
      await flush();

      const btn = document.getElementById('save-wishlist-btn');
      expect(btn.disabled).toBe(false);
      expect(document.getElementById('snackbar').textContent).toContain('Validation failed');
    });

    it('restores button text after failed save', async () => {
      globalThis.fetch = vi.fn(() => Promise.resolve(errorResponse));
      document.getElementById('save-wishlist-btn').click();
      await flush();

      expect(document.getElementById('save-wishlist-btn').textContent).toBe('Save Wishlist');
    });
  });
});
