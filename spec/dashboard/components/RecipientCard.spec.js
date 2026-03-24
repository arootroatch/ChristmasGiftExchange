import {describe, it, expect, beforeEach, vi} from 'vitest';
import {JSDOM} from 'jsdom';
import {dashboardEvents, DashboardEvents, resetState, setRecipientData, setRecipientWishlist} from '../../../src/dashboard/state.js';
import {init} from '../../../src/dashboard/components/RecipientCard.js';

function setupDOM() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="snackbar" class="hidden"></div>
    <div id="section-recipient"></div>
  </body></html>`, {url: 'http://localhost/dashboard'});
  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
}

describe('RecipientCard', () => {
  beforeEach(() => {
    setupDOM();
    dashboardEvents.clear();
    resetState();
    init();
  });

  it('renders a loading spinner initially', () => {
    const spinner = document.querySelector('.spinner');
    expect(spinner).not.toBeNull();
  });

  describe('RECIPIENT_LOADED event', () => {
    it('renders recipient name when RECIPIENT_LOADED fires', () => {
      setRecipientData({recipient: 'Alice', date: '2025-12-01', exchangeId: 'ex123', giverName: 'Bob'});

      const text = document.querySelector('#recipient-card').textContent;
      expect(text).toContain('Alice');
    });

    it('renders the exchange date', () => {
      setRecipientData({recipient: 'Alice', date: '2025-12-15', exchangeId: 'ex123', giverName: 'Bob'});

      const text = document.querySelector('#recipient-card').textContent;
      expect(text).toContain('Dec');
    });

    it('shows no-exchange message when recipientName is falsy', () => {
      setRecipientData({recipient: '', date: '', exchangeId: '', giverName: ''});

      const text = document.querySelector('#recipient-card').textContent;
      expect(text).toContain("No exchange found yet");
    });

    it('renders wishlist inline when data includes wishlists', () => {
      setRecipientData({
        recipient: 'Alice', date: '2025-12-01', exchangeId: 'ex123', giverName: 'Bob',
        wishlists: [{url: 'https://example.com/list', title: 'My List'}],
        wishItems: [],
        currency: 'USD',
      });

      const container = document.querySelector('#recipient-wishlist-view');
      expect(container.hidden).toBe(false);
      expect(container.textContent).toContain('My List');
    });

    it('shows empty message when recipient has no wishlists', () => {
      setRecipientData({
        recipient: 'Alice', date: '2025-12-01', exchangeId: 'ex123', giverName: 'Bob',
        wishlists: [], wishItems: [], currency: 'USD',
      });

      const container = document.querySelector('#recipient-wishlist-view');
      expect(container.hidden).toBe(false);
      expect(container.textContent).toContain("hasn't added any wishlists yet");
    });
  });

  describe('RECIPIENT_WISHLIST_LOADED event (via setRecipientWishlist)', () => {
    beforeEach(() => {
      setRecipientData({recipient: 'Alice', date: '2025-12-01', exchangeId: 'ex123', giverName: 'Bob'});
    });

    it('renders wishlist links when wishlists are present', () => {
      setRecipientWishlist({
        recipientName: 'Alice',
        wishlists: [{url: 'https://example.com/list', title: 'My Amazon List'}],
        wishItems: [],
      });

      const link = document.querySelector('#recipient-wishlist-view a');
      expect(link).not.toBeNull();
      expect(link.textContent).toBe('My Amazon List');
      expect(link.href).toBe('https://example.com/list');
    });

    it('renders individual wish items when items are present', () => {
      setRecipientWishlist({
        recipientName: 'Alice',
        wishlists: [],
        wishItems: [{url: 'https://example.com/item', title: 'Nice Scarf', price: 2500}],
        currency: 'USD',
      });

      const link = document.querySelector('#recipient-wishlist-view a');
      expect(link).not.toBeNull();
      expect(link.textContent).toBe('Nice Scarf');
    });

    it('shows the wishlist container after wishlist loads', () => {
      setRecipientWishlist({recipientName: 'Alice', wishlists: [], wishItems: []});

      const container = document.querySelector('#recipient-wishlist-view');
      expect(container.hidden).toBe(false);
    });
  });
});
