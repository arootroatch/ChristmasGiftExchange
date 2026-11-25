import {apiFetch} from '../utils.js';

let pending = null;

function fetchMyExchanges() {
  return new Promise((resolve, reject) => {
    apiFetch('/.netlify/functions/api-my-exchanges-get', {
      method: 'GET',
      onSuccess: resolve,
      onError: (msg) => reject(new Error(msg)),
      fallbackMessage: 'Failed to load exchanges. Please try again.',
    });
  });
}

export function loadMyExchanges() {
  if (!pending) {
    const request = fetchMyExchanges();
    request.catch(() => {
      if (pending === request) pending = null;
    });
    pending = request;
  }
  return pending;
}

export function _resetMyExchanges() {
  pending = null;
}
