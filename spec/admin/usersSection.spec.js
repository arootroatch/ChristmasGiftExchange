import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import * as snackbar from '../../src/Snackbar.js';
import {render} from '../../src/admin/usersSection.js';

const json = (body, ok = true, status = 200) => ({ok, status, json: async () => body});
const counts = (exchange, secretSanta, linkMode) => ({exchange, secretSanta, linkMode});
const user = (overrides = {}) => ({
  _id: 'u1', name: 'Alice', email: 'alice@x.com', isAdmin: false,
  organized: counts(1, 2, 3), participant: counts(4, 5, 6), total: counts(5, 7, 9),
  ...overrides,
});

let locationMock;
const flush = () => new Promise(r => setTimeout(r, 0));

function stubFetch(users, viewAsResponse = json({success: true})) {
  globalThis.fetch = vi.fn((url) => Promise.resolve(
    url.includes('api-admin-users-get') ? json({users}) : viewAsResponse));
}

describe('usersSection', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="section-users"></div>';
    snackbar.init();
    locationMock = {href: ''};
    vi.stubGlobal('location', locationMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const container = () => document.getElementById('section-users');

  it('renders a row per user with counts', async () => {
    stubFetch([user(), user({_id: 'u2', name: 'Bob', email: 'bob@x.com'})]);
    render(container());
    await vi.waitFor(() => expect(container().querySelectorAll('tbody tr').length).toBe(2));
    const row = container().querySelector('tbody tr');
    expect(row.textContent).toContain('Alice');
    expect(row.textContent).toContain('alice@x.com');
    expect(row.textContent).toContain('1 · 2 · 3');
    expect(row.textContent).toContain('4 · 5 · 6');
    expect(row.textContent).toContain('5 · 7 · 9');
  });

  it('searches with the typed query', async () => {
    stubFetch([]);
    render(container());
    await flush();
    vi.useFakeTimers();
    const input = container().querySelector('input[type="search"]');
    input.value = 'ali';
    input.dispatchEvent(new Event('input'));
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300);
    expect(globalThis.fetch).toHaveBeenLastCalledWith(expect.stringContaining('q=ali'));
  });

  it('View as posts the user id and navigates to /dashboard', async () => {
    stubFetch([user()]);
    render(container());
    await vi.waitFor(() => expect(container().querySelector('[data-user-id]')).not.toBeNull());
    container().querySelector('[data-user-id="u1"]').click();
    await vi.waitFor(() => expect(locationMock.href).toBe('/dashboard'));
    const call = globalThis.fetch.mock.calls.find(([url]) => url.includes('api-admin-view-as-post'));
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({userId: 'u1'});
  });

  it('shows the server error and stays put when View as fails', async () => {
    stubFetch([user()], json({error: 'Cannot view as an admin'}, false, 400));
    render(container());
    await vi.waitFor(() => expect(container().querySelector('[data-user-id]')).not.toBeNull());
    container().querySelector('[data-user-id="u1"]').click();
    await vi.waitFor(() => expect(document.body.textContent).toContain('Cannot view as an admin'));
    expect(locationMock.href).toBe('');
  });

  it('shows an error when the search fetch is rejected', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('offline')));
    render(container());
    await vi.waitFor(() => expect(document.body.textContent).toContain('Failed to load users'));
  });

  it('does not show an error when a superseded search fetch is rejected', async () => {
    const rejecters = {};
    globalThis.fetch = vi.fn((url) => new Promise((resolve, reject) => {
      const q = decodeURIComponent(url.split('q=')[1]);
      rejecters[q] = {resolve, reject};
    }));
    render(container());
    const input = container().querySelector('input[type="search"]');
    input.value = 'al';
    input.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(rejecters.al).toBeDefined());
    rejecters.al.resolve(json({users: [user({name: 'Alan'})]}));
    await vi.waitFor(() => expect(container().textContent).toContain('Alan'));
    rejecters[''].reject(new Error('offline'));
    await flush();
    expect(document.body.textContent).not.toContain('Failed to load users');
  });

  it('shows an error and stays put when the View as request is rejected', async () => {
    globalThis.fetch = vi.fn((url) => url.includes('api-admin-users-get')
      ? Promise.resolve(json({users: [user()]}))
      : Promise.reject(new Error('offline')));
    render(container());
    await vi.waitFor(() => expect(container().querySelector('[data-user-id]')).not.toBeNull());
    container().querySelector('[data-user-id="u1"]').click();
    await vi.waitFor(() => expect(document.body.textContent).toContain('Failed to view as user'));
    expect(locationMock.href).toBe('');
  });

  it("disables View as on the admin's own row", async () => {
    stubFetch([user({_id: 'a', isAdmin: true}), user()]);
    render(container());
    await vi.waitFor(() => expect(container().querySelectorAll('[data-user-id]').length).toBe(2));
    expect(container().querySelector('[data-user-id="a"]').disabled).toBe(true);
    expect(container().querySelector('[data-user-id="u1"]').disabled).toBe(false);
  });

  it('escapes user names', async () => {
    stubFetch([user({name: '<img src=x onerror=alert(1)>'})]);
    render(container());
    await vi.waitFor(() => expect(container().querySelector('tbody tr')).not.toBeNull());
    expect(container().querySelector('tbody img')).toBeNull();
    expect(container().querySelector('tbody tr').textContent).toContain('<img src=x');
  });

  it('ignores a stale response that resolves after a newer one', async () => {
    const pending = {};
    globalThis.fetch = vi.fn((url) => new Promise((resolve) => {
      pending[decodeURIComponent(url.split('q=')[1])] = resolve;
    }));
    render(container());
    const input = container().querySelector('input[type="search"]');
    input.value = 'al';
    input.dispatchEvent(new Event('input'));
    await vi.waitFor(() => expect(pending.al).toBeDefined());
    pending.al(json({users: [user({name: 'Alan'})]}));
    await vi.waitFor(() => expect(container().textContent).toContain('Alan'));
    pending[''](json({users: [user({name: 'Everyone'})]}));
    await flush();
    expect(container().textContent).toContain('Alan');
    expect(container().textContent).not.toContain('Everyone');
  });
});
