import {EventEmitter} from '../EventEmitter.js';

export const dashboardEvents = new EventEmitter();

export const DashboardEvents = {
  USER_LOADED: 'user:loaded',
  WISHLISTS_CHANGED: 'wishlists:changed',
  ITEMS_CHANGED: 'items:changed',
  DIRTY_CHANGED: 'dirty:changed',
  RECIPIENT_LOADED: 'recipient:loaded',
  RECIPIENT_WISHLIST_LOADED: 'recipient-wishlist:loaded',
};

function defaultUser() {
  return {name: '', email: '', wishlists: [], wishItems: [], currency: 'USD'};
}

const dashboardState = {
  user: defaultUser(),
  savedSnapshot: null,
  recipientName: '',
  date: '',
  exchangeId: '',
  recipientWishlist: null,
};

export function resetState() {
  dashboardState.user = defaultUser();
  dashboardState.savedSnapshot = null;
  dashboardState.recipientName = '';
  dashboardState.date = '';
  dashboardState.exchangeId = '';
  dashboardState.recipientWishlist = null;
}

function snapshot() {
  return JSON.stringify({
    wishlists: dashboardState.user.wishlists,
    wishItems: dashboardState.user.wishItems,
    currency: dashboardState.user.currency,
  });
}

export function isDirty() {
  if (!dashboardState.savedSnapshot) return false;
  return snapshot() !== dashboardState.savedSnapshot;
}

export function markClean() {
  dashboardState.savedSnapshot = snapshot();
  dashboardEvents.emit(DashboardEvents.DIRTY_CHANGED, {dirty: false});
}

function emitDirtyIfChanged() {
  dashboardEvents.emit(DashboardEvents.DIRTY_CHANGED, {dirty: isDirty()});
}

export function setUserData(data) {
  dashboardState.user = data;
  dashboardState.savedSnapshot = snapshot();
  dashboardEvents.emit(DashboardEvents.USER_LOADED, {...dashboardState});
}

export function setCurrency(code) {
  dashboardState.user.currency = code;
  dashboardEvents.emit(DashboardEvents.ITEMS_CHANGED, {...dashboardState});
  emitDirtyIfChanged();
}

export function addWishlist(wishlist) {
  dashboardState.user.wishlists.push(wishlist);
  dashboardEvents.emit(DashboardEvents.WISHLISTS_CHANGED, {...dashboardState});
  emitDirtyIfChanged();
}

export function deleteWishlist(index) {
  dashboardState.user.wishlists.splice(index, 1);
  dashboardEvents.emit(DashboardEvents.WISHLISTS_CHANGED, {...dashboardState});
  emitDirtyIfChanged();
}

export function addItem(item) {
  dashboardState.user.wishItems.push(item);
  dashboardEvents.emit(DashboardEvents.ITEMS_CHANGED, {...dashboardState});
  emitDirtyIfChanged();
}

export function deleteItem(index) {
  dashboardState.user.wishItems.splice(index, 1);
  dashboardEvents.emit(DashboardEvents.ITEMS_CHANGED, {...dashboardState});
  emitDirtyIfChanged();
}

export function setRecipientData(data) {
  dashboardState.recipientName = data.name;
  dashboardState.date = data.date;
  dashboardState.exchangeId = data.exchangeId;
  dashboardEvents.emit(DashboardEvents.RECIPIENT_LOADED, {...dashboardState});

  if (data.wishlists !== undefined) {
    dashboardState.recipientWishlist = {
      name: data.name,
      wishlists: data.wishlists,
      wishItems: data.wishItems,
      currency: data.currency,
    };
    dashboardEvents.emit(DashboardEvents.RECIPIENT_WISHLIST_LOADED, {...dashboardState});
  }
}

export function setRecipientWishlist(data) {
  dashboardState.recipientWishlist = data;
  dashboardEvents.emit(DashboardEvents.RECIPIENT_WISHLIST_LOADED, {...dashboardState});
}
