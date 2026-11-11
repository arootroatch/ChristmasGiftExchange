import {describe, it, expect, vi, beforeEach} from 'vitest';
import fs from 'fs';
import path from 'path';
import {JSDOM} from 'jsdom';

const html = fs.readFileSync(path.resolve(__dirname, '../../pages/admin/index.html'), 'utf8');
const flush = () => new Promise(r => setTimeout(r, 0));

let document, locationMock;

function setupDOM(url = 'http://localhost/admin') {
  const dom = new JSDOM(html, {url});
  document = dom.window.document;
  const loc = dom.window.location;
  locationMock = {pathname: loc.pathname, search: loc.search, href: loc.href, reload: vi.fn()};
  globalThis.document = document;
  globalThis.window = new Proxy(dom.window, {
    get(target, prop) {
      if (prop === 'location') return locationMock;
      return Reflect.get(target, prop);
    },
  });
}

const json = (body, ok = true, status = 200) => ({ok, status, json: async () => body});

function stubFetch({session = {name: 'Admin', email: 'a@test.com'}} = {}) {
  globalThis.fetch = vi.fn((url) => {
    if (url.includes('api-user-get')) return Promise.resolve(json(session));
    if (url.includes('api-admin-logs-get')) return Promise.resolve(json({logs: [], distinctEndpoints: [], page: 1, totalPages: 1, total: 0}));
    if (url.includes('api-admin-users-get')) return Promise.resolve(json({users: []}));
    return Promise.resolve(json({logLevel: 'warn'}));
  });
}

async function loadMain(url) {
  vi.resetModules();
  setupDOM(url);
  const {main} = await import('../../src/admin/index.js');
  await main();
  await flush();
}

describe('Admin portal', () => {
  beforeEach(() => stubFetch());

  it('renders Logs and Users nav items after login', async () => {
    await loadMain();
    const items = [...document.querySelectorAll('.nav-item')].map(i => i.textContent);
    expect(items).toEqual(['Logs', 'Users']);
  });

  it('shows the logs section by default at /admin', async () => {
    await loadMain('http://localhost/admin');
    expect(document.querySelector('#section-logs').hidden).toBe(false);
    expect(document.querySelector('#section-users').hidden).toBe(true);
    expect(document.querySelector('#log-level-container')).not.toBeNull();
  });

  it('shows the users section at /admin/users', async () => {
    await loadMain('http://localhost/admin/users');
    expect(document.querySelector('#section-users').hidden).toBe(false);
    expect(document.querySelector('#section-logs').hidden).toBe(true);
  });

  it('clicking Users pushes /admin/users', async () => {
    await loadMain();
    const push = vi.spyOn(window.history, 'pushState');
    document.querySelector('.nav-item[data-section="users"]').click();
    expect(push).toHaveBeenCalledWith(null, '', '/admin/users');
    expect(document.querySelector('#section-users').hidden).toBe(false);
    expect(document.querySelector('#section-logs').hidden).toBe(true);
  });

  it('shows the admin gate when there is no session', async () => {
    stubFetch({session: null});
    await loadMain();
    expect(document.querySelector('#admin-send-code')).not.toBeNull();
    expect(document.querySelector('.nav-item')).toBeNull();
  });

  it('shows the view-as banner after logging in through the gate', async () => {
    let loggedIn = false;
    globalThis.fetch = vi.fn((url) => {
      if (url.includes('api-user-get')) {
        return Promise.resolve(json(loggedIn ? {name: 'Admin', email: 'a@test.com', viewingAs: {name: 'Jane', email: 'jane@x.com'}} : null));
      }
      if (url.includes('api-admin-verify-post')) { loggedIn = true; return Promise.resolve(json({success: true})); }
      if (url.includes('api-admin-logs-get')) return Promise.resolve(json({logs: [], distinctEndpoints: [], page: 1, totalPages: 1, total: 0}));
      if (url.includes('api-admin-users-get')) return Promise.resolve(json({users: []}));
      return Promise.resolve(json({logLevel: 'warn'}));
    });
    await loadMain();
    expect(document.querySelector('#view-as-banner')).toBeNull();
    document.querySelector('#admin-code').value = '123456';
    document.querySelector('#admin-verify-code').click();
    await vi.waitFor(() => expect(document.querySelector('#view-as-banner')).not.toBeNull());
    expect(document.querySelectorAll('#view-as-banner').length).toBe(1);
    expect(document.querySelector('.nav-item')).not.toBeNull();
  });
});
