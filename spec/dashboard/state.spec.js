import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  dashboardEvents,
  DashboardEvents,
  resetState,
  setUserData,
  addWishlist,
  deleteWishlist,
  addItem,
  deleteItem,
  setRecipientData,
  setRecipientWishlist,
  isDirty,
  markClean,
  setCurrency,
} from '../../src/dashboard/state.js';

describe('dashboardState', () => {
  beforeEach(() => {
    resetState();
  });

  describe('resetState', () => {
    it('resets state to defaults', () => {
      setUserData({name: 'John', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: [{url: 'https://b.com', title: 'B', price: '$10'}]});
      resetState();

      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.USER_LOADED, spy);
      setUserData({name: '', wishlists: [], wishItems: []});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({name: '', wishlists: [], wishItems: []}),
      }));
      unsub();
    });
  });

  describe('setUserData', () => {
    it('sets user data and emits USER_LOADED', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.USER_LOADED, spy);

      setUserData({name: 'Jane', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({name: 'Jane', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []}),
      }));
      unsub();
    });
  });

  describe('addWishlist', () => {
    it('adds wishlist and emits WISHLISTS_CHANGED', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.WISHLISTS_CHANGED, spy);

      addWishlist({url: 'https://amazon.com', title: 'My List'});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({wishlists: [{url: 'https://amazon.com', title: 'My List'}], wishItems: []}),
      }));
      unsub();
    });
  });

  describe('deleteWishlist', () => {
    it('removes wishlist at index and emits WISHLISTS_CHANGED', () => {
      addWishlist({url: 'https://a.com', title: 'A'});
      addWishlist({url: 'https://b.com', title: 'B'});

      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.WISHLISTS_CHANGED, spy);
      deleteWishlist(0);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({wishlists: [{url: 'https://b.com', title: 'B'}], wishItems: []}),
      }));
      unsub();
    });
  });

  describe('addItem', () => {
    it('adds item and emits ITEMS_CHANGED', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.ITEMS_CHANGED, spy);

      addItem({url: 'https://example.com/thing', title: 'Thing', price: '$15'});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({wishlists: [], wishItems: [{url: 'https://example.com/thing', title: 'Thing', price: '$15'}]}),
      }));
      unsub();
    });
  });

  describe('deleteItem', () => {
    it('removes item at index and emits ITEMS_CHANGED', () => {
      addItem({url: 'https://a.com', title: 'A', price: '$5'});
      addItem({url: 'https://b.com', title: 'B', price: '$10'});

      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.ITEMS_CHANGED, spy);
      deleteItem(0);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({wishlists: [], wishItems: [{url: 'https://b.com', title: 'B', price: '$10'}]}),
      }));
      unsub();
    });
  });

  describe('dirty tracking', () => {
    it('is not dirty after setUserData', () => {
      setUserData({name: 'Jane', wishlists: [], wishItems: []});
      expect(isDirty()).toBe(false);
    });

    it('is dirty after addWishlist', () => {
      setUserData({name: 'Jane', wishlists: [], wishItems: []});
      addWishlist({url: 'https://a.com', title: 'A'});
      expect(isDirty()).toBe(true);
    });

    it('is dirty after addItem', () => {
      setUserData({name: 'Jane', wishlists: [], wishItems: []});
      addItem({url: 'https://a.com', title: 'A', price: '$5'});
      expect(isDirty()).toBe(true);
    });

    it('is dirty after deleteWishlist', () => {
      setUserData({name: 'Jane', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []});
      deleteWishlist(0);
      expect(isDirty()).toBe(true);
    });

    it('is not dirty after undoing a change', () => {
      setUserData({name: 'Jane', wishlists: [], wishItems: []});
      addWishlist({url: 'https://a.com', title: 'A'});
      deleteWishlist(0);
      expect(isDirty()).toBe(false);
    });

    it('is not dirty after markClean', () => {
      setUserData({name: 'Jane', wishlists: [], wishItems: []});
      addWishlist({url: 'https://a.com', title: 'A'});
      markClean();
      expect(isDirty()).toBe(false);
    });

    it('emits DIRTY_CHANGED when state becomes dirty', () => {
      setUserData({name: 'Jane', wishlists: [], wishItems: []});
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.DIRTY_CHANGED, spy);

      addWishlist({url: 'https://a.com', title: 'A'});

      expect(spy).toHaveBeenCalledWith({dirty: true});
      unsub();
    });

    it('emits DIRTY_CHANGED with false after markClean', () => {
      setUserData({name: 'Jane', wishlists: [], wishItems: []});
      addWishlist({url: 'https://a.com', title: 'A'});
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.DIRTY_CHANGED, spy);

      markClean();

      expect(spy).toHaveBeenCalledWith({dirty: false});
      unsub();
    });
  });

  describe('currency', () => {
    it('reads currency from server data', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.USER_LOADED, spy);
      setUserData({name: 'Jane', wishlists: [], wishItems: [], currency: 'EUR'});
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({currency: 'EUR'}),
      }));
      unsub();
    });

    it('setCurrency updates state and emits ITEMS_CHANGED', () => {
      setUserData({name: 'Jane', wishlists: [], wishItems: []});
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.ITEMS_CHANGED, spy);
      setCurrency('GBP');
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.objectContaining({currency: 'GBP'}),
      }));
      unsub();
    });

    it('setCurrency marks state as dirty', () => {
      setUserData({name: 'Jane', wishlists: [], wishItems: []});
      setCurrency('EUR');
      expect(isDirty()).toBe(true);
    });

    it('currency change is detected by dirty tracking', () => {
      setUserData({name: 'Jane', wishlists: [], wishItems: [], currency: 'USD'});
      setCurrency('EUR');
      expect(isDirty()).toBe(true);
      setCurrency('USD');
      expect(isDirty()).toBe(false);
    });
  });

  describe('setRecipientData', () => {
    it('maps API response fields to state and emits RECIPIENT_LOADED', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.RECIPIENT_LOADED, spy);

      setRecipientData({name: 'Bob', date: '2024-12-25', exchangeId: 'abc123'});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        recipientName: 'Bob',
        date: '2024-12-25',
        exchangeId: 'abc123',
      }));
      unsub();
    });
  });

  describe('setRecipientWishlist', () => {
    it('stores recipient wishlist data and emits RECIPIENT_WISHLIST_LOADED', () => {
      const spy = vi.fn();
      const unsub = dashboardEvents.on(DashboardEvents.RECIPIENT_WISHLIST_LOADED, spy);

      const wishlistData = {wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: [{url: 'https://b.com', title: 'B', price: '$20'}]};
      setRecipientWishlist(wishlistData);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        recipientWishlist: wishlistData,
      }));
      unsub();
    });
  });
});
