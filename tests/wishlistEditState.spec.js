import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  wishlistEditEvents,
  WishlistEditEvents,
  setUserData,
  resetState,
  addWishlist,
  deleteWishlist,
  addItem,
  deleteItem,
} from '../src/wishlistEditState.js';

describe('wishlistEditState', () => {
  beforeEach(() => {
    resetState();
  });

  describe('resetState', () => {
    it('resets state to defaults', () => {
      setUserData({name: 'John', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: [{url: 'https://b.com', title: 'B'}]});
      resetState();

      const spy = vi.fn();
      const unsub = wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, spy);
      setUserData({name: '', wishlists: [], wishItems: []});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userName: '',
        userData: {wishlists: [], wishItems: []},
      }));
      unsub();
    });
  });

  describe('setUserData', () => {
    it('sets user data and emits USER_LOADED', () => {
      const spy = vi.fn();
      const unsub = wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, spy);

      setUserData({name: 'John', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userName: 'John',
        userData: {wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []},
      }));
      unsub();
    });
  });

  describe('addWishlist', () => {
    it('adds wishlist and emits WISHLISTS_CHANGED', () => {
      const spy = vi.fn();
      const unsub = wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, spy);

      addWishlist({url: 'https://amazon.com', title: 'My List'});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userData: {wishlists: [{url: 'https://amazon.com', title: 'My List'}], wishItems: []},
      }));
      unsub();
    });
  });

  describe('deleteWishlist', () => {
    it('removes wishlist at index and emits WISHLISTS_CHANGED', () => {
      addWishlist({url: 'https://a.com', title: 'A'});
      addWishlist({url: 'https://b.com', title: 'B'});

      const spy = vi.fn();
      const unsub = wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, spy);
      deleteWishlist(0);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userData: {wishlists: [{url: 'https://b.com', title: 'B'}], wishItems: []},
      }));
      unsub();
    });
  });

  describe('addItem', () => {
    it('adds item and emits ITEMS_CHANGED', () => {
      const spy = vi.fn();
      const unsub = wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, spy);

      addItem({url: 'https://example.com/thing', title: 'Thing'});

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userData: {wishlists: [], wishItems: [{url: 'https://example.com/thing', title: 'Thing'}]},
      }));
      unsub();
    });
  });

  describe('deleteItem', () => {
    it('removes item at index and emits ITEMS_CHANGED', () => {
      addItem({url: 'https://a.com', title: 'A'});
      addItem({url: 'https://b.com', title: 'B'});

      const spy = vi.fn();
      const unsub = wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, spy);
      deleteItem(0);

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        userData: {wishlists: [], wishItems: [{url: 'https://b.com', title: 'B'}]},
      }));
      unsub();
    });
  });
});
