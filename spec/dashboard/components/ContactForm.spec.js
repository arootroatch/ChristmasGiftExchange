import {describe, it, expect, beforeEach, vi} from 'vitest';
import {JSDOM} from 'jsdom';

const flush = () => new Promise(r => setTimeout(r, 0));

function setupDOM() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <div id="snackbar" class="hidden"></div>
    <div id="section-contact"><div data-slot="contact"></div></div>
  </body></html>`, {url: 'http://localhost/dashboard'});

  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
}

function stubFetch(response) {
  globalThis.fetch = vi.fn(() => Promise.resolve(response));
}

const successResponse = {ok: true, status: 200, json: async () => ({sent: true})};
const errorResponse = {ok: false, status: 500, json: async () => ({error: 'Server error'})};

describe('ContactForm', () => {
  beforeEach(async () => {
    vi.resetModules();
    setupDOM();
    stubFetch(successResponse);
  });

  async function initContactForm() {
    const mod = await import('../../../src/dashboard/components/ContactForm.js');
    const snackbarMod = await import('../../../src/Snackbar.js');
    snackbarMod.init();
    mod.init();
    return mod;
  }

  it('renders the contact form with all fields', async () => {
    await initContactForm();

    expect(document.getElementById('contact-address')).not.toBeNull();
    expect(document.getElementById('contact-phone')).not.toBeNull();
    expect(document.getElementById('contact-notes')).not.toBeNull();
    expect(document.getElementById('send-contact-btn')).not.toBeNull();
  });

  describe('validation', () => {
    it('shows error when all fields are empty', async () => {
      await initContactForm();
      document.getElementById('send-contact-btn').click();
      await flush();

      expect(document.getElementById('snackbar').textContent).toContain('at least one field');
    });

    it('shows error when fields contain only whitespace', async () => {
      await initContactForm();
      document.getElementById('contact-address').value = '   ';
      document.getElementById('send-contact-btn').click();
      await flush();

      expect(document.getElementById('snackbar').textContent).toContain('at least one field');
    });

    it('does not call API when validation fails', async () => {
      await initContactForm();
      document.getElementById('send-contact-btn').click();
      await flush();

      expect(globalThis.fetch).not.toHaveBeenCalled();
    });
  });

  describe('successful send', () => {
    it('calls api-user-contact-post with field values', async () => {
      await initContactForm();
      document.getElementById('contact-address').value = '123 Main St';
      document.getElementById('contact-phone').value = '555-1234';
      document.getElementById('contact-notes').value = 'Size L';
      document.getElementById('send-contact-btn').click();
      await flush();

      const call = globalThis.fetch.mock.calls[0];
      expect(call[0]).toContain('api-user-contact-post');
      const body = JSON.parse(call[1].body);
      expect(body.address).toBe('123 Main St');
      expect(body.phone).toBe('555-1234');
      expect(body.notes).toBe('Size L');
    });

    it('accepts send with only address filled', async () => {
      await initContactForm();
      document.getElementById('contact-address').value = '123 Main St';
      document.getElementById('send-contact-btn').click();
      await flush();

      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('accepts send with only phone filled', async () => {
      await initContactForm();
      document.getElementById('contact-phone').value = '555-1234';
      document.getElementById('send-contact-btn').click();
      await flush();

      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('accepts send with only notes filled', async () => {
      await initContactForm();
      document.getElementById('contact-notes').value = 'Some notes';
      document.getElementById('send-contact-btn').click();
      await flush();

      expect(globalThis.fetch).toHaveBeenCalled();
    });

    it('shows success snackbar on successful send', async () => {
      await initContactForm();
      document.getElementById('contact-address').value = '123 Main St';
      document.getElementById('send-contact-btn').click();
      await flush();

      expect(document.getElementById('snackbar').textContent).toContain('Contact info sent');
    });

    it('clears form fields after successful send', async () => {
      await initContactForm();
      document.getElementById('contact-address').value = '123 Main St';
      document.getElementById('contact-phone').value = '555-1234';
      document.getElementById('contact-notes').value = 'Size L';
      document.getElementById('send-contact-btn').click();
      await flush();

      expect(document.getElementById('contact-address').value).toBe('');
      expect(document.getElementById('contact-phone').value).toBe('');
      expect(document.getElementById('contact-notes').value).toBe('');
    });
  });

  describe('button states', () => {
    it('disables button and shows "Sending..." during request', async () => {
      globalThis.fetch = vi.fn(() => new Promise(() => {})); // never resolves
      await initContactForm();
      document.getElementById('contact-address').value = '123 Main St';
      document.getElementById('send-contact-btn').click();

      const btn = document.getElementById('send-contact-btn');
      expect(btn.disabled).toBe(true);
      expect(btn.textContent).toBe('Sending...');
    });

    it('re-enables button after successful send', async () => {
      await initContactForm();
      document.getElementById('contact-address').value = '123 Main St';
      document.getElementById('send-contact-btn').click();
      await flush();

      const btn = document.getElementById('send-contact-btn');
      expect(btn.disabled).toBe(false);
      expect(btn.textContent).toBe('Send to My Secret Santa');
    });

    it('re-enables button after failed send', async () => {
      stubFetch(errorResponse);
      await initContactForm();
      document.getElementById('contact-address').value = '123 Main St';
      document.getElementById('send-contact-btn').click();
      await flush();

      const btn = document.getElementById('send-contact-btn');
      expect(btn.disabled).toBe(false);
      expect(btn.textContent).toBe('Send to My Secret Santa');
    });
  });

  describe('error handling', () => {
    it('shows error snackbar on API failure', async () => {
      stubFetch({ok: false, status: 400, json: async () => ({error: 'Bad request'})});
      await initContactForm();
      document.getElementById('contact-address').value = '123 Main St';
      document.getElementById('send-contact-btn').click();
      await flush();

      expect(document.getElementById('snackbar').textContent).toContain('Bad request');
    });

    it('does not clear form on API failure', async () => {
      stubFetch(errorResponse);
      await initContactForm();
      document.getElementById('contact-address').value = '123 Main St';
      document.getElementById('send-contact-btn').click();
      await flush();

      expect(document.getElementById('contact-address').value).toBe('123 Main St');
    });
  });
});
