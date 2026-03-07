import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  wishlistEditEvents,
  WishlistEditEvents,
  wishlistEditState,
  setUserData,
  addWishlist,
  deleteWishlist,
  addItem,
  deleteItem,
} from '../src/wishlistEditState.js';

describe('wishlistEditState', () => {
  beforeEach(() => {
    setUserData({name: '', wishlists: [], wishItems: []});
  });

  describe('setUserData', () => {
    it('sets user data and emits USER_LOADED', () => {
      const spy = vi.fn();
      const unsub = wishlistEditEvents.on(WishlistEditEvents.USER_LOADED, spy);

      setUserData({name: 'John', wishlists: [{url: 'https://a.com', title: 'A'}], wishItems: []});

      expect(wishlistEditState.userName).toBe('John');
      expect(wishlistEditState.userData.wishlists).toEqual([{url: 'https://a.com', title: 'A'}]);
      expect(spy).toHaveBeenCalled();
      unsub();
    });
  });

  describe('addWishlist', () => {
    it('adds wishlist and emits WISHLISTS_CHANGED', () => {
      const spy = vi.fn();
      const unsub = wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, spy);

      addWishlist({url: 'https://amazon.com', title: 'My List'});

      expect(wishlistEditState.userData.wishlists).toEqual([{url: 'https://amazon.com', title: 'My List'}]);
      expect(spy).toHaveBeenCalled();
      unsub();
    });
  });

  describe('deleteWishlist', () => {
    it('removes wishlist at index and emits WISHLISTS_CHANGED', () => {
      const spy = vi.fn();
      addWishlist({url: 'https://a.com', title: 'A'});
      addWishlist({url: 'https://b.com', title: 'B'});

      const unsub = wishlistEditEvents.on(WishlistEditEvents.WISHLISTS_CHANGED, spy);
      deleteWishlist(0);

      expect(wishlistEditState.userData.wishlists).toEqual([{url: 'https://b.com', title: 'B'}]);
      expect(spy).toHaveBeenCalled();
      unsub();
    });
  });

  describe('addItem', () => {
    it('adds item and emits ITEMS_CHANGED', () => {
      const spy = vi.fn();
      const unsub = wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, spy);

      addItem({url: 'https://example.com/thing', title: 'Thing'});

      expect(wishlistEditState.userData.wishItems).toEqual([{url: 'https://example.com/thing', title: 'Thing'}]);
      expect(spy).toHaveBeenCalled();
      unsub();
    });
  });

  describe('deleteItem', () => {
    it('removes item at index and emits ITEMS_CHANGED', () => {
      const spy = vi.fn();
      addItem({url: 'https://a.com', title: 'A'});
      addItem({url: 'https://b.com', title: 'B'});

      const unsub = wishlistEditEvents.on(WishlistEditEvents.ITEMS_CHANGED, spy);
      deleteItem(0);

      expect(wishlistEditState.userData.wishItems).toEqual([{url: 'https://b.com', title: 'B'}]);
      expect(spy).toHaveBeenCalled();
      unsub();
    });
  });
});
