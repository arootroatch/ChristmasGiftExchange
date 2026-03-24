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

const dashboardState = {
  userName: '',
  userData: {wishlists: [], wishItems: [], currency: 'USD'},
  savedUserData: null,
  giverName: '',
  recipientName: '',
  date: '',
  exchangeId: '',
  recipientWishlist: null,
};

export function resetState() {
  dashboardState.userName = '';
  dashboardState.userData = {wishlists: [], wishItems: [], currency: 'USD'};
  dashboardState.savedUserData = null;
  dashboardState.giverName = '';
  dashboardState.recipientName = '';
  dashboardState.date = '';
  dashboardState.exchangeId = '';
  dashboardState.recipientWishlist = null;
}

function snapshotUserData() {
  return JSON.stringify({
    wishlists: dashboardState.userData.wishlists,
    wishItems: dashboardState.userData.wishItems,
    currency: dashboardState.userData.currency,
  });
}

export function isDirty() {
  if (!dashboardState.savedUserData) return false;
  return snapshotUserData() !== dashboardState.savedUserData;
}

export function markClean() {
  dashboardState.savedUserData = snapshotUserData();
  dashboardEvents.emit(DashboardEvents.DIRTY_CHANGED, {dirty: false});
}

function emitDirtyIfChanged() {
  dashboardEvents.emit(DashboardEvents.DIRTY_CHANGED, {dirty: isDirty()});
}

export function setUserData(data) {
  dashboardState.userName = data.name;
  dashboardState.userData = {
    wishlists: data.wishlists,
    wishItems: data.wishItems,
    currency: data.currency || 'USD',
  };
  dashboardState.savedUserData = snapshotUserData();
  dashboardEvents.emit(DashboardEvents.USER_LOADED, {...dashboardState});
}

export function setCurrency(code) {
  dashboardState.userData.currency = code;
  dashboardEvents.emit(DashboardEvents.ITEMS_CHANGED, {...dashboardState});
  emitDirtyIfChanged();
}

export function addWishlist(wishlist) {
  dashboardState.userData.wishlists.push(wishlist);
  dashboardEvents.emit(DashboardEvents.WISHLISTS_CHANGED, {...dashboardState});
  emitDirtyIfChanged();
}

export function deleteWishlist(index) {
  dashboardState.userData.wishlists.splice(index, 1);
  dashboardEvents.emit(DashboardEvents.WISHLISTS_CHANGED, {...dashboardState});
  emitDirtyIfChanged();
}

export function addItem(item) {
  dashboardState.userData.wishItems.push(item);
  dashboardEvents.emit(DashboardEvents.ITEMS_CHANGED, {...dashboardState});
  emitDirtyIfChanged();
}

export function deleteItem(index) {
  dashboardState.userData.wishItems.splice(index, 1);
  dashboardEvents.emit(DashboardEvents.ITEMS_CHANGED, {...dashboardState});
  emitDirtyIfChanged();
}

export function setRecipientData(data) {
  dashboardState.giverName = data.giverName;
  dashboardState.recipientName = data.recipient;
  dashboardState.date = data.date;
  dashboardState.exchangeId = data.exchangeId;
  dashboardEvents.emit(DashboardEvents.RECIPIENT_LOADED, {...dashboardState});

  if (data.wishlists !== undefined) {
    dashboardState.recipientWishlist = {
      recipientName: data.recipient,
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
