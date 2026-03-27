import {describe, it, expect, beforeEach} from 'vitest';
import {JSDOM} from 'jsdom';
import {dashboardEvents, resetState, setUserData, addItem, setCurrency} from '../../../src/dashboard/state.js';
import {init} from '../../../src/dashboard/components/ItemList.js';
import {init as initSnackbar} from '../../../src/Snackbar.js';

function setupDOM() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="snackbar" class="hidden"></div>
    <div id="section-wishlist"><div data-slot="items"></div></div>
  </body></html>`, {url: 'http://localhost/dashboard'});

  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
}

function userData(overrides = {}) {
  return {name: 'Alice', email: 'a@test.com', wishlists: [], wishItems: [], currency: 'USD', ...overrides};
}

describe('ItemList', () => {
  beforeEach(() => {
    setupDOM();
    dashboardEvents.clear();
    resetState();
    initSnackbar();
    init();
  });

  it('renders the item form', () => {
    expect(document.getElementById('item-url')).not.toBeNull();
    expect(document.getElementById('item-title')).not.toBeNull();
    expect(document.getElementById('item-price')).not.toBeNull();
    expect(document.getElementById('add-item-btn')).not.toBeNull();
    expect(document.getElementById('item-currency')).not.toBeNull();
  });

  it('renders all currency options', () => {
    const options = document.querySelectorAll('#item-currency option');
    const codes = [...options].map(o => o.value);
    expect(codes).toEqual(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']);
  });

  describe('rendering items', () => {
    it('renders item entries on USER_LOADED', () => {
      setUserData(userData({wishItems: [{url: 'https://amazon.com/item', title: 'Headphones', price: 2500}]}));

      const list = document.getElementById('items-list');
      expect(list.textContent).toContain('Headphones');
      expect(list.querySelector('a').href).toBe('https://amazon.com/item');
    });

    it('renders formatted price', () => {
      setUserData(userData({wishItems: [{url: 'https://amazon.com/item', title: 'Headphones', price: 2500}]}));

      expect(document.getElementById('items-list').textContent).toContain('$25.00');
    });

    it('does not render price when price is 0', () => {
      setUserData(userData({wishItems: [{url: 'https://amazon.com/item', title: 'Headphones', price: 0}]}));

      expect(document.querySelector('#items-list .item-price')).toBeNull();
    });

    it('renders multiple entries', () => {
      setUserData(userData({wishItems: [
        {url: 'https://amazon.com/item1', title: 'Item 1', price: 1000},
        {url: 'https://amazon.com/item2', title: 'Item 2', price: 2000},
      ]}));

      const entries = document.querySelectorAll('#items-list .wishlist-entry');
      expect(entries.length).toBe(2);
    });

    it('updates on ITEMS_CHANGED via addItem', () => {
      setUserData(userData());
      addItem({url: 'https://amazon.com/new', title: 'New Item', price: 500});

      expect(document.getElementById('items-list').textContent).toContain('New Item');
    });
  });

  describe('currency switching', () => {
    it('updates currency via select change', () => {
      setUserData(userData());

      const select = document.getElementById('item-currency');
      select.value = 'JPY';
      select.dispatchEvent(new window.Event('change'));

      // JPY has 0 decimals, so step should be 1
      expect(document.getElementById('item-price').step).toBe('1');
      expect(document.getElementById('item-price').placeholder).toBe('2500');
    });

    it('restores currency from user data', () => {
      setUserData(userData({currency: 'EUR'}));

      const selected = document.getElementById('item-currency').value;
      expect(selected).toBe('EUR');
    });

    it('formats prices in the selected currency', () => {
      setUserData(userData({
        currency: 'JPY',
        wishItems: [{url: 'https://amazon.co.jp/item', title: 'Item', price: 2500}],
      }));

      expect(document.getElementById('items-list').textContent).toContain('¥2,500');
    });
  });

  describe('adding items', () => {
    beforeEach(() => {
      setUserData(userData());
    });

    it('shows error when URL and title are empty', () => {
      document.getElementById('add-item-btn').click();

      expect(document.getElementById('snackbar').textContent).toContain('URL and title');
    });

    it('shows error when only URL is provided', () => {
      document.getElementById('item-url').value = 'https://amazon.com/item';
      document.getElementById('add-item-btn').click();

      expect(document.getElementById('snackbar').textContent).toContain('URL and title');
    });

    it('shows error for invalid URL', () => {
      document.getElementById('item-url').value = 'not-a-url';
      document.getElementById('item-title').value = 'Title';
      document.getElementById('add-item-btn').click();

      expect(document.getElementById('snackbar').textContent).toContain('valid URL');
    });

    it('shows error for negative price', () => {
      document.getElementById('item-url').value = 'https://amazon.com/item';
      document.getElementById('item-title').value = 'Title';
      document.getElementById('item-price').value = '-5';
      document.getElementById('add-item-btn').click();

      expect(document.getElementById('snackbar').textContent).toContain('valid price');
    });

    it('accepts item when price field has non-numeric text (number input coerces to empty)', () => {
      document.getElementById('item-url').value = 'https://amazon.com/item';
      document.getElementById('item-title').value = 'Title';
      document.getElementById('item-price').value = 'abc'; // number input coerces to ''
      document.getElementById('add-item-btn').click();

      // Empty price string is valid (price defaults to 0)
      expect(document.getElementById('items-list').textContent).toContain('Title');
    });

    it('shows error for decimal price with JPY currency', () => {
      // Switch to JPY first
      const select = document.getElementById('item-currency');
      select.value = 'JPY';
      select.dispatchEvent(new window.Event('change'));

      document.getElementById('item-url').value = 'https://amazon.co.jp/item';
      document.getElementById('item-title').value = 'Title';
      document.getElementById('item-price').value = '25.50';
      document.getElementById('add-item-btn').click();

      expect(document.getElementById('snackbar').textContent).toContain('whole number');
    });

    it('shows error for too many decimal places', () => {
      document.getElementById('item-url').value = 'https://amazon.com/item';
      document.getElementById('item-title').value = 'Title';
      document.getElementById('item-price').value = '25.999';
      document.getElementById('add-item-btn').click();

      expect(document.getElementById('snackbar').textContent).toContain('valid price');
    });

    it('adds item with valid data and clears form', () => {
      document.getElementById('item-url').value = 'https://amazon.com/item';
      document.getElementById('item-title').value = 'Headphones';
      document.getElementById('item-price').value = '25.50';
      document.getElementById('add-item-btn').click();

      expect(document.getElementById('item-url').value).toBe('');
      expect(document.getElementById('item-title').value).toBe('');
      expect(document.getElementById('item-price').value).toBe('');
      expect(document.getElementById('items-list').textContent).toContain('Headphones');
    });

    it('adds item with no price (price defaults to 0)', () => {
      document.getElementById('item-url').value = 'https://amazon.com/item';
      document.getElementById('item-title').value = 'Free Thing';
      document.getElementById('add-item-btn').click();

      expect(document.getElementById('items-list').textContent).toContain('Free Thing');
      expect(document.querySelector('#items-list .item-price')).toBeNull();
    });

    it('converts price to smallest unit', () => {
      document.getElementById('item-url').value = 'https://amazon.com/item';
      document.getElementById('item-title').value = 'Item';
      document.getElementById('item-price').value = '25.50';
      document.getElementById('add-item-btn').click();

      // $25.50 should be rendered as $25.50 (stored as 2550 cents)
      expect(document.getElementById('items-list').textContent).toContain('$25.50');
    });
  });

  describe('deleting items', () => {
    it('removes entry when delete button is clicked', () => {
      setUserData(userData({wishItems: [
        {url: 'https://amazon.com/item1', title: 'Item 1', price: 1000},
        {url: 'https://amazon.com/item2', title: 'Item 2', price: 2000},
      ]}));

      document.querySelector('.delete-btn[data-index="0"]').click();

      const entries = document.querySelectorAll('#items-list .wishlist-entry');
      expect(entries.length).toBe(1);
      expect(document.getElementById('items-list').textContent).toContain('Item 2');
      expect(document.getElementById('items-list').textContent).not.toContain('Item 1');
    });

    it('ignores clicks outside delete buttons', () => {
      setUserData(userData({wishItems: [{url: 'https://amazon.com/item', title: 'Item', price: 1000}]}));

      document.getElementById('items-list').click();

      expect(document.querySelectorAll('#items-list .wishlist-entry').length).toBe(1);
    });
  });
});
