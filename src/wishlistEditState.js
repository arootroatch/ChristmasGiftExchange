import {EventEmitter} from './Events.js';

export const wishlistEditEvents = new EventEmitter();

export const WishlistEditEvents = {
  USER_LOADED: 'user:loaded',
  WISHLISTS_CHANGED: 'wishlists:changed',
  ITEMS_CHANGED: 'items:changed',
};

const wishlistEditState = {
  userName: '',
  userData: {wishlists: [], wishItems: []},
};

export function resetState() {
  wishlistEditState.userName = '';
  wishlistEditState.userData = {wishlists: [], wishItems: []};
}

export function setUserData(data) {
  wishlistEditState.userName = data.name;
  wishlistEditState.userData = {wishlists: data.wishlists, wishItems: data.wishItems};
  wishlistEditEvents.emit(WishlistEditEvents.USER_LOADED, {...wishlistEditState});
}

export function addWishlist(wishlist) {
  wishlistEditState.userData.wishlists.push(wishlist);
  wishlistEditEvents.emit(WishlistEditEvents.WISHLISTS_CHANGED, {...wishlistEditState});
}

export function deleteWishlist(index) {
  wishlistEditState.userData.wishlists.splice(index, 1);
  wishlistEditEvents.emit(WishlistEditEvents.WISHLISTS_CHANGED, {...wishlistEditState});
}

export function addItem(item) {
  wishlistEditState.userData.wishItems.push(item);
  wishlistEditEvents.emit(WishlistEditEvents.ITEMS_CHANGED, {...wishlistEditState});
}

export function deleteItem(index) {
  wishlistEditState.userData.wishItems.splice(index, 1);
  wishlistEditEvents.emit(WishlistEditEvents.ITEMS_CHANGED, {...wishlistEditState});
}
