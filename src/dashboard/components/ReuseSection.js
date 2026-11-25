import {selectElement, escape, escapeAttr} from '../../utils.js';
import {loadMyExchanges} from '../myExchanges.js';
import btnStyles from '../../../assets/styles/dashboard/components/buttons.module.css';
import cardStyles from '../../../assets/styles/dashboard/components/cards.module.css';

export function init() {
  const container = selectElement('#section-reuse');
  container.innerHTML = `
    <div id="reuse-results">
      <div class="spinner-container"><div class="spinner"></div></div>
    </div>`;

  loadExchanges();
}

async function loadExchanges() {
  try {
    const data = await loadMyExchanges();
    if (data.length === 0) {
      selectElement('#reuse-results').innerHTML = '<p class="empty-state">No past exchanges found.</p>';
      return;
    }
    renderResults(data);
  } catch (error) {
    selectElement('#reuse-results').innerHTML = `<p class="empty-state">${escape(error.message || 'Failed to load exchanges')}</p>`;
  }
}

function renderResults(exchanges) {
  const container = selectElement('#reuse-results');
  container.innerHTML = exchanges.map(ex => `
    <div class="${cardStyles.exchangeResult} card-slide">
      <h3>${new Date(ex.createdAt).toLocaleDateString()}</h3>
      <p><strong>Participants:</strong> ${escape(ex.participantNames.join(', '))}</p>
      ${ex.houses.length > 0 ? `<p><strong>Households:</strong> ${ex.houses.map(h => `${escape(h.name)} (${escape(h.members.join(', '))})`).join('; ')}</p>` : ''}
      <button class="${btnStyles.button} use-exchange-btn" data-exchange='${escapeAttr(JSON.stringify(ex))}'>
        Use This Exchange
      </button>
    </div>
  `).join('');

  container.querySelectorAll('.use-exchange-btn').forEach(btn => {
    btn.addEventListener('click', useExchange);
  });
}

function useExchange(event) {
  const exchangeData = JSON.parse(event.currentTarget.dataset.exchange);
  sessionStorage.setItem('reuseExchange', JSON.stringify(exchangeData));
  window.location.href = '/';
}
