import {describe, it, expect, beforeEach, vi} from 'vitest';
import {JSDOM} from 'jsdom';
import {init} from '../../../src/dashboard/components/ReuseSection.js';

const flush = () => new Promise(r => setTimeout(r, 0));

let locationMock;

function setupDOM() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="snackbar" class="hidden"></div>
    <div id="section-reuse"></div>
  </body></html>`, {url: 'http://localhost/dashboard'});

  const loc = dom.window.location;
  locationMock = {
    pathname: loc.pathname,
    search: loc.search,
    href: loc.href,
  };

  const windowProxy = new Proxy(dom.window, {
    get(target, prop) {
      if (prop === 'location') return locationMock;
      return Reflect.get(target, prop);
    },
  });

  globalThis.document = dom.window.document;
  globalThis.window = windowProxy;
  globalThis.sessionStorage = dom.window.sessionStorage;
}

describe('ReuseSection', () => {
  it('renders a loading spinner on init', () => {
    setupDOM();
    globalThis.fetch = vi.fn(() => new Promise(() => {}));
    init();

    expect(document.querySelector('#reuse-results .spinner')).not.toBeNull();
  });

  it('auto-loads exchanges on init', () => {
    setupDOM();
    globalThis.fetch = vi.fn(() => new Promise(() => {}));
    init();

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api-my-exchanges-get'),
      expect.objectContaining({method: 'GET'})
    );
  });

  describe('after data loads', () => {
    beforeEach(() => {
      setupDOM();
    });

    it('renders exchange results after successful load', async () => {
      const exchanges = [{createdAt: '2024-12-01T00:00:00Z', participantNames: ['Alice', 'Bob'], houses: []}];
      globalThis.fetch = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => exchanges});
      init();
      await flush();

      const results = document.querySelector('#reuse-results');
      expect(results.querySelector('.exchange-result')).not.toBeNull();
      expect(results.textContent).toContain('Alice');
      expect(results.textContent).toContain('Bob');
    });

    it('shows empty message when no exchanges found', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => []});
      init();
      await flush();

      expect(document.querySelector('#reuse-results').textContent).toContain('No past exchanges found');
    });

    it('shows error message on fetch failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({ok: false, status: 400, json: async () => ({error: 'Unauthorized'})});
      init();
      await flush();

      expect(document.querySelector('#reuse-results').textContent).toContain('Unauthorized');
    });
  });

  describe('"Use This Exchange" button', () => {
    beforeEach(async () => {
      setupDOM();
      const exchanges = [{createdAt: '2024-12-01T00:00:00Z', participantNames: ['Alice', 'Bob'], houses: []}];
      globalThis.fetch = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => exchanges});
      init();
      await flush();
    });

    it('saves exchange data to sessionStorage when clicked', () => {
      document.querySelector('.use-exchange-btn').click();
      const stored = JSON.parse(globalThis.sessionStorage.getItem('reuseExchange'));
      expect(stored.participantNames).toEqual(['Alice', 'Bob']);
    });

    it('navigates to "/" when clicked', () => {
      document.querySelector('.use-exchange-btn').click();
      expect(locationMock.href).toBe('/');
    });
  });
});
