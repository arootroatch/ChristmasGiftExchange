import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import fs from 'fs';
import path from 'path';
import {JSDOM} from 'jsdom';
import {dashboardEvents, resetState} from '../../src/dashboard/state.js';

const html = fs.readFileSync(
  path.resolve(__dirname, '../../pages/dashboard/index.html'),
  'utf8'
);

let dom, document, window;
const flush = () => new Promise(r => setTimeout(r, 0));

function setupDOM(url = 'http://localhost/dashboard') {
  dom = new JSDOM(html, {url});
  document = dom.window.document;
  window = dom.window;
  globalThis.document = document;
  globalThis.window = window;
  globalThis.sessionStorage = window.sessionStorage;
}

function mockFetchSequence(...responses) {
  let call = 0;
  globalThis.fetch = vi.fn(() => {
    const res = responses[call] ?? responses[responses.length - 1];
    call++;
    return Promise.resolve(res);
  });
}

const successUserResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    name: 'Alice',
    email: 'alice@test.com',
    wishlists: [],
    wishItems: [],
    currency: 'USD',
  }),
};

const unauthorizedResponse = {
  ok: false,
  status: 401,
  json: async () => ({error: 'Unauthorized'}),
};

const recipientResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    giverName: 'Alice',
    recipient: 'Bob',
    date: '2025-12-25',
    exchangeId: 'ex123',
  }),
};

describe('Dashboard index', () => {
  beforeEach(() => {
    vi.resetModules();
    setupDOM();
    dashboardEvents.clear();
    resetState();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading spinner initially (from HTML)', () => {
    const spinner = document.querySelector('#dashboard-content .spinner');
    expect(spinner).not.toBeNull();
  });

  describe('loadData: 401 response', () => {
    it('shows auth gate when api-user-get returns 401', async () => {
      mockFetchSequence(unauthorizedResponse);

      const {main} = await import('../../src/dashboard/index.js');
      main();
      await flush();

      const authGate = document.getElementById('auth-gate');
      expect(authGate).not.toBeNull();
    });

    it('shows auth gate heading "Verify Your Email"', async () => {
      mockFetchSequence(unauthorizedResponse);

      const {main} = await import('../../src/dashboard/index.js');
      main();
      await flush();

      const heading = document.querySelector('#auth-gate h2');
      expect(heading.textContent).toContain('Verify Your Email');
    });
  });

  describe('loadData: success response', () => {
    beforeEach(async () => {
      mockFetchSequence(successUserResponse, recipientResponse);

      const {main} = await import('../../src/dashboard/index.js');
      main();
      await flush();
    });

    it('renders sidebar with welcome message', () => {
      const welcome = document.querySelector('.sidebar-welcome');
      expect(welcome).not.toBeNull();
      expect(welcome.textContent).toContain('Alice');
    });

    it('renders sidebar navigation items', () => {
      const navItems = document.querySelectorAll('.nav-item');
      expect(navItems.length).toBe(4);
    });

    it('renders recipient section as active by default', () => {
      const section = document.querySelector('#section-recipient');
      expect(section).not.toBeNull();
      expect(section.hidden).toBe(false);
    });

    it('renders other sections as hidden', () => {
      expect(document.querySelector('#section-wishlist').hidden).toBe(true);
      expect(document.querySelector('#section-contact').hidden).toBe(true);
      expect(document.querySelector('#section-reuse').hidden).toBe(true);
    });

    it('switches section when nav item is clicked', () => {
      const wishlistNav = document.querySelector('[data-section="wishlist"]');
      wishlistNav.click();

      expect(document.querySelector('#section-recipient').hidden).toBe(true);
      expect(document.querySelector('#section-wishlist').hidden).toBe(false);
    });

    it('updates active class on nav click', () => {
      const wishlistNav = document.querySelector('[data-section="wishlist"]');
      wishlistNav.click();

      expect(wishlistNav.classList.contains('active')).toBe(true);
      const recipientNav = document.querySelector('[data-section="recipient"]');
      expect(recipientNav.classList.contains('active')).toBe(false);
    });

    it('renders logout link in sidebar', () => {
      const logout = document.getElementById('sidebar-logout');
      expect(logout).not.toBeNull();
      expect(logout.textContent).toContain('Log out');
    });

    it('renders logout link in hamburger bar', () => {
      const logout = document.querySelector('.hamburger-bar #hamburger-logout');
      expect(logout).not.toBeNull();
    });

    it('calls logout endpoint when sidebar logout is clicked', async () => {
      globalThis.fetch.mockClear();
      document.getElementById('sidebar-logout').click();
      await flush();

      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/.netlify/functions/api-auth-logout-post',
        expect.objectContaining({method: 'POST'})
      );
    });
  });

  describe('deep linking', () => {
    it('activates wishlist section when URL path is /dashboard/wishlist', async () => {
      setupDOM('http://localhost/dashboard/wishlist');
      mockFetchSequence(successUserResponse, recipientResponse);

      const {main} = await import('../../src/dashboard/index.js');
      main();
      await flush();

      expect(document.querySelector('#section-wishlist').hidden).toBe(false);
      expect(document.querySelector('#section-recipient').hidden).toBe(true);
    });
  });

  describe('loadData: non-401 error response', () => {
    it('shows snackbar error on 500', async () => {
      mockFetchSequence({ok: false, status: 500, json: async () => ({})});

      const {main} = await import('../../src/dashboard/index.js');
      main();
      await flush();

      const snackbar = document.getElementById('snackbar');
      expect(snackbar.textContent).toContain('Something went wrong');
    });
  });
});
