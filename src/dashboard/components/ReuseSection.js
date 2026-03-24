import {selectElement, escape, escapeAttr, apiFetch} from '../../utils.js';

export function init() {
  const container = selectElement('#section-reuse');
  container.innerHTML = `
    <div id="reuse-results">
      <div class="spinner-container"><div class="spinner"></div></div>
    </div>`;

  loadExchanges();
}

async function loadExchanges() {
  await apiFetch('/.netlify/functions/api-my-exchanges-get', {
    method: 'GET',
    onSuccess: (data) => {
      if (data.length === 0) {
        selectElement('#reuse-results').innerHTML = '<p class="empty-state">No past exchanges found.</p>';
        return;
      }
      renderResults(data);
    },
    onError: (msg) => {
      selectElement('#reuse-results').innerHTML = `<p class="empty-state">${escape(msg || 'Failed to load exchanges')}</p>`;
    },
    fallbackMessage: 'Failed to load exchanges. Please try again.',
  });
}

function renderResults(exchanges) {
  const container = selectElement('#reuse-results');
  container.innerHTML = exchanges.map(ex => `
    <div class="exchange-result">
      <h3>${new Date(ex.createdAt).toLocaleDateString()}</h3>
      <p><strong>Participants:</strong> ${escape(ex.participantNames.join(', '))}</p>
      ${ex.houses.length > 0 ? `<p><strong>Households:</strong> ${ex.houses.map(h => `${escape(h.name)} (${escape(h.members.join(', '))})`).join('; ')}</p>` : ''}
      <button class="button use-exchange-btn" data-exchange='${escapeAttr(JSON.stringify(ex))}'>
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
