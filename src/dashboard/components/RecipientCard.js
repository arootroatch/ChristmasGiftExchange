import {dashboardEvents, DashboardEvents} from '../state.js';
import {selectElement, escape, escapeAttr} from '../../utils.js';
import {formatPrice} from '../formatPrice.js';
import cardStyles from '../../../assets/styles/dashboard/components/cards.module.css';
import rcStyles from '../../../assets/styles/dashboard/components/recipient-card.module.css';
import wishStyles from '../../../assets/styles/dashboard/components/wishlist.module.css';

function template() {
  return `<section id="recipient-card" class="${cardStyles.card}">
    <div class="spinner-container"><div class="spinner"></div></div>
  </section>`;
}

export function init() {
  selectElement('#section-recipient').innerHTML = template();
  dashboardEvents.on(DashboardEvents.RECIPIENT_LOADED, renderRecipient);
  dashboardEvents.on(DashboardEvents.RECIPIENT_WISHLIST_LOADED, renderWishlist);
}

function renderRecipient({recipientName, date}) {
  const card = selectElement('#recipient-card');
  if (!recipientName) {
    card.innerHTML = '<p>No exchange found yet. Once you\'ve been added to a gift exchange, your recipient will appear here.</p>';
    return;
  }

  const dateObj = new Date(date);
  card.innerHTML = `
    <p class="${rcStyles.recipientReveal}">You're buying a gift for <strong>${escape(recipientName)}!</strong></p>
    <p class="${rcStyles.dateSecondary}">As of ${escape(dateObj.toDateString())}</p>
    <hr>
    <div class="${rcStyles.wishlistView}" id="recipient-wishlist-view" hidden>
      <div class="spinner-container"><div class="spinner"></div></div>
    </div>`;
}

function renderWishlist({recipientWishlist}) {
  const container = selectElement('#recipient-wishlist-view');
  if (!container) return;
  container.hidden = false;

  const data = recipientWishlist;
  if (data.wishlists.length === 0 && data.wishItems.length === 0) {
    container.innerHTML = `<p>${escape(data.name)} hasn't added any wishlists yet. Check back later!</p>`;
    return;
  }

  let html = '';
  if (data.wishlists.length > 0) {
    html += '<h3>Wishlists</h3><ul>';
    data.wishlists.forEach(w => {
      html += `<li><a href="${escapeAttr(w.url)}" target="_blank">${escape(w.title || w.url)}</a></li>`;
    });
    html += '</ul>';
  }
  if (data.wishItems.length > 0) {
    html += '<h3>Individual Items</h3><ul>';
    data.wishItems.forEach(item => {
      const price = item.price ? ` <span class="${wishStyles.itemPrice}">${formatPrice(item.price, data.currency || 'USD')}</span>` : '';
      html += `<li><a href="${escapeAttr(item.url)}" target="_blank">${escape(item.title || item.url)}</a>${price}</li>`;
    });
    html += '</ul>';
  }
  container.innerHTML = html;
}
