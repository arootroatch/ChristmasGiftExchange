import {describe, it, expect, beforeEach} from 'vitest';
import {JSDOM} from 'jsdom';
import {dashboardEvents, DashboardEvents, resetState, setUserData, addWishlist} from '../../../src/dashboard/state.js';
import {init} from '../../../src/dashboard/components/WishlistList.js';
import {init as initSnackbar} from '../../../src/Snackbar.js';

function setupDOM() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="snackbar" class="hidden"></div>
    <div id="section-wishlist"><div data-slot="wishlists"></div></div>
  </body></html>`, {url: 'http://localhost/dashboard'});

  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
}

function userData(overrides = {}) {
  return {name: 'Alice', email: 'a@test.com', wishlists: [], wishItems: [], currency: 'USD', ...overrides};
}

describe('WishlistList', () => {
  beforeEach(() => {
    setupDOM();
    dashboardEvents.clear();
    resetState();
    initSnackbar();
    init();
  });

  it('renders the wishlist form', () => {
    expect(document.getElementById('wishlist-url')).not.toBeNull();
    expect(document.getElementById('wishlist-title')).not.toBeNull();
    expect(document.getElementById('add-wishlist-btn')).not.toBeNull();
  });

  describe('rendering wishlists', () => {
    it('renders wishlist entries on USER_LOADED', () => {
      setUserData(userData({wishlists: [{url: 'https://amazon.com/list', title: 'My List'}]}));

      const list = document.getElementById('wishlists-list');
      expect(list.textContent).toContain('My List');
      expect(list.querySelector('a').href).toBe('https://amazon.com/list');
    });

    it('renders URL as link text when title matches URL', () => {
      setUserData(userData({wishlists: [{url: 'https://amazon.com/list', title: 'https://amazon.com/list'}]}));

      const link = document.querySelector('#wishlists-list a');
      expect(link.textContent).toBe('https://amazon.com/list');
    });

    it('renders multiple entries', () => {
      setUserData(userData({wishlists: [
        {url: 'https://amazon.com/list1', title: 'List 1'},
        {url: 'https://target.com/list2', title: 'List 2'},
      ]}));

      const entries = document.querySelectorAll('#wishlists-list .wishlist-entry');
      expect(entries.length).toBe(2);
    });

    it('updates on WISHLISTS_CHANGED via addWishlist', () => {
      setUserData(userData());

      addWishlist({url: 'https://amazon.com/new', title: 'New'});

      expect(document.getElementById('wishlists-list').textContent).toContain('New');
    });
  });

  describe('adding wishlists', () => {
    beforeEach(() => {
      setUserData(userData());
    });

    it('does nothing when URL is empty', () => {
      document.getElementById('add-wishlist-btn').click();

      expect(document.querySelectorAll('#wishlists-list .wishlist-entry').length).toBe(0);
    });

    it('shows error for invalid URL', () => {
      document.getElementById('wishlist-url').value = 'not-a-url';
      document.getElementById('add-wishlist-btn').click();

      expect(document.getElementById('snackbar').textContent).toContain('valid URL');
    });

    it('adds wishlist with valid URL and clears form', () => {
      document.getElementById('wishlist-url').value = 'https://amazon.com/list';
      document.getElementById('wishlist-title').value = 'My List';
      document.getElementById('add-wishlist-btn').click();

      expect(document.getElementById('wishlist-url').value).toBe('');
      expect(document.getElementById('wishlist-title').value).toBe('');
      expect(document.getElementById('wishlists-list').textContent).toContain('My List');
    });

    it('uses URL as title when title is empty', () => {
      document.getElementById('wishlist-url').value = 'https://amazon.com/list';
      document.getElementById('add-wishlist-btn').click();

      const link = document.querySelector('#wishlists-list a');
      expect(link.textContent).toBe('https://amazon.com/list');
    });
  });

  describe('deleting wishlists', () => {
    it('removes entry when delete button is clicked', () => {
      setUserData(userData({wishlists: [
        {url: 'https://amazon.com/list1', title: 'List 1'},
        {url: 'https://target.com/list2', title: 'List 2'},
      ]}));

      document.querySelector('.delete-btn[data-index="0"]').click();

      const entries = document.querySelectorAll('#wishlists-list .wishlist-entry');
      expect(entries.length).toBe(1);
      expect(document.getElementById('wishlists-list').textContent).toContain('List 2');
      expect(document.getElementById('wishlists-list').textContent).not.toContain('List 1');
    });

    it('ignores clicks outside delete buttons', () => {
      setUserData(userData({wishlists: [{url: 'https://amazon.com/list', title: 'List'}]}));

      document.getElementById('wishlists-list').click();

      expect(document.querySelectorAll('#wishlists-list .wishlist-entry').length).toBe(1);
    });
  });
});
