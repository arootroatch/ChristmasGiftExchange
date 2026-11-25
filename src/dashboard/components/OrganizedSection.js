import {selectElement, escape} from '../../utils.js';
import {loadMyExchanges} from '../myExchanges.js';
import styles from '../../../assets/styles/dashboard/components/organized.module.css';

export function init() {
  const navItem = selectElement('.nav-item[data-section="organized"]');
  if (navItem) navItem.hidden = true;
  const container = selectElement('#section-organized');
  container.innerHTML = '<div class="spinner-container"><div class="spinner"></div></div>';

  loadOrganized(container, navItem);
}

async function loadOrganized(container, navItem) {
  try {
    const exchanges = await loadMyExchanges();
    renderOrganized(container, navItem, exchanges.filter(ex => ex.isOrganizer));
  } catch (error) {
    container.innerHTML = `<p class="empty-state">${escape(error.message || 'Failed to load exchanges')}</p>`;
  }
}

function renderOrganized(container, navItem, organized) {
  if (organized.length === 0) {
    container.innerHTML = '<p class="empty-state">You haven\'t organized any exchanges yet.</p>';
    return;
  }
  container.innerHTML = organized.map(cardTemplate).join('');
  attachListeners(container);
  if (navItem) navItem.hidden = false;
}

function attachListeners(container) {
  container.querySelectorAll('.reveal-btn').forEach(btn => {
    btn.addEventListener('click', () => reveal(btn));
  });
}

function reveal(btn) {
  const row = btn.closest(`.${styles.row}`);
  row.querySelectorAll(`.${styles.blurred}`).forEach(el => el.classList.remove(styles.blurred));
  btn.remove();
}

function modeLabel(exchange) {
  if (exchange.isLinkMode) return 'Link draw';
  if (exchange.isSecretSanta) return 'Secret Santa';
  return 'Gift exchange';
}

function cardTemplate(exchange) {
  return `
    <div class="${styles.card} card-slide">
      <h3>${new Date(exchange.createdAt).toLocaleDateString()}<span class="${styles.mode}">${modeLabel(exchange)}</span></h3>
      <ul class="${styles.rows}">${exchange.results.map(r => rowTemplate(exchange, r)).join('')}</ul>
    </div>`;
}

function blurClass(isBlurred) {
  return isBlurred ? ` ${styles.blurred}` : '';
}

const revealButton = `<button type="button" class="${styles.revealButton} reveal-btn">Reveal</button>`;

function recipientTemplate(result) {
  if (result.hasDrawn === false) return `<span class="${styles.pending}">hasn't drawn yet</span>`;
  return result.recipientIsYou ? 'You' : escape(result.recipientName);
}

function rowTemplate(exchange, result) {
  const blurGiver = result.recipientIsYou && (exchange.isSecretSanta || exchange.isLinkMode);
  const blurRecipient = exchange.isLinkMode && exchange.organizerMatched === false && result.hasDrawn;
  const email = exchange.isLinkMode
    ? ''
    : `<span class="${styles.email}${blurClass(blurGiver)}">${escape(result.giverEmail)}</span>`;
  return `
    <li class="${styles.row}">
      <span class="${styles.giver}${blurClass(blurGiver)}">${escape(result.giverName)}</span>
      ${email}
      <span class="${styles.arrow}" aria-label="gives to">→</span>
      <span class="${styles.recipient}${blurClass(blurRecipient)}">${recipientTemplate(result)}</span>
      ${blurGiver || blurRecipient ? revealButton : ''}
    </li>`;
}
