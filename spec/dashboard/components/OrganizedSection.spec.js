import {describe, it, expect, beforeEach, vi} from 'vitest';
import {JSDOM} from 'jsdom';
import {init} from '../../../src/dashboard/components/OrganizedSection.js';
import {_resetMyExchanges} from '../../../src/dashboard/myExchanges.js';
import styles from '../../../assets/styles/dashboard/components/organized.module.css';

const flush = () => new Promise(r => setTimeout(r, 0));

function setupDOM() {
  const dom = new JSDOM(`<!DOCTYPE html><html><body>
    <a class="nav-item" data-section="organized"></a>
    <div id="section-organized"></div>
  </body></html>`, {url: 'http://localhost/dashboard'});

  globalThis.document = dom.window.document;
  globalThis.window = dom.window;
}

function mockExchanges(exchanges) {
  globalThis.fetch = vi.fn().mockResolvedValue({ok: true, status: 200, json: async () => exchanges});
}

async function renderWith(exchanges) {
  mockExchanges(exchanges);
  init();
  await flush();
}

function secretSanta(overrides = {}) {
  return {
    exchangeId: 'ss',
    createdAt: '2024-12-01T00:00:00Z',
    isSecretSanta: true,
    isOrganizer: true,
    results: [
      {giverName: 'Alex', giverEmail: 'alex@test.com', recipientName: 'Whitney', recipientEmail: 'whitney@test.com', recipientIsYou: false},
      {giverName: 'Whitney', giverEmail: 'whitney@test.com', recipientName: 'Hunter', recipientEmail: 'hunter@test.com', recipientIsYou: false},
      {giverName: 'Hunter', giverEmail: 'hunter@test.com', recipientName: 'Alex', recipientEmail: 'alex@test.com', recipientIsYou: true},
    ],
    ...overrides,
  };
}

function linkDraw(overrides = {}) {
  return {
    exchangeId: 'link',
    createdAt: '2024-12-01T00:00:00Z',
    isSecretSanta: true,
    isLinkMode: true,
    isOrganizer: true,
    organizerMatched: true,
    results: [
      {giverName: 'Alex', hasDrawn: false, recipientName: null, recipientIsYou: false},
      {giverName: 'Whitney', hasDrawn: true, recipientName: 'Alex', recipientIsYou: true},
      {giverName: 'Hunter', hasDrawn: true, recipientName: 'Whitney', recipientIsYou: false},
    ],
    ...overrides,
  };
}

const participantOnly = {exchangeId: 'p', createdAt: '2023-12-01T00:00:00Z', isSecretSanta: true, isOrganizer: false};

const navItem = () => document.querySelector('.nav-item[data-section="organized"]');
const section = () => document.querySelector('#section-organized');
const cards = () => section().querySelectorAll(`.${styles.card}`);
const rows = (card = section()) => card.querySelectorAll(`.${styles.row}`);
const blurredRows = () => [...rows()].filter(r => r.querySelector(`.${styles.blurred}`));

describe('OrganizedSection', () => {
  beforeEach(() => {
    _resetMyExchanges();
    setupDOM();
  });

  it('hides the nav item and shows empty state when nothing is organized', async () => {
    await renderWith([participantOnly]);

    expect(navItem().hidden).toBe(true);
    expect(section().querySelector('.empty-state').textContent).toBe("You haven't organized any exchanges yet.");
  });

  it('shows the nav item and one card per organized exchange', async () => {
    await renderWith([secretSanta({exchangeId: 'a'}), participantOnly, secretSanta({exchangeId: 'b', createdAt: '2022-12-01T00:00:00Z'})]);

    expect(navItem().hidden).toBe(false);
    expect(cards()).toHaveLength(2);
    expect(cards()[0].querySelector('h3').textContent).toContain(new Date('2024-12-01T00:00:00Z').toLocaleDateString());
    expect(cards()[0].querySelector('h3').textContent).toContain('Secret Santa');
  });

  it('renders giver, email and recipient for each row', async () => {
    await renderWith([secretSanta({isSecretSanta: false})]);

    const texts = [...rows()].map(r => r.textContent.replace(/\s+/g, ' ').trim());
    expect(texts).toEqual([
      'Alex alex@test.com → Whitney whitney@test.com',
      'Whitney whitney@test.com → Hunter hunter@test.com',
      'Hunter hunter@test.com → Alex alex@test.com',
    ]);
  });

  it('blurs only the row where the organizer is the recipient in secret santa', async () => {
    await renderWith([secretSanta()]);

    const blurred = blurredRows();
    expect(blurred).toHaveLength(1);
    expect(blurred[0]).toBe(rows()[2]);
    const blurredTexts = [...blurred[0].querySelectorAll(`.${styles.blurred}`)].map(el => el.textContent);
    expect(blurredTexts).toEqual(['Hunter', 'hunter@test.com']);
    expect(blurred[0].textContent.replace(/\s+/g, ' ')).toContain('→ Alex alex@test.com');
    expect(blurred[0].querySelector('button.reveal-btn')).not.toBeNull();
  });

  it('reveal button unblurs that row', async () => {
    await renderWith([secretSanta()]);

    const row = rows()[2];
    row.querySelector('.reveal-btn').click();

    expect(row.querySelectorAll(`.${styles.blurred}`)).toHaveLength(0);
    expect(row.querySelector('.reveal-btn')).toBeNull();
  });

  it('does not blur non-secret-santa exchanges', async () => {
    await renderWith([secretSanta({isSecretSanta: false})]);

    expect(section().querySelectorAll(`.${styles.blurred}`)).toHaveLength(0);
    expect(section().querySelector('.reveal-btn')).toBeNull();
  });

  it("link draw: shows hasn't drawn yet and blurs only the organizer row when matched", async () => {
    await renderWith([linkDraw()]);

    expect(cards()[0].querySelector('h3').textContent).toContain('Link draw');
    expect(rows()[0].textContent).toContain("hasn't drawn yet");
    expect(rows()[0].textContent).not.toContain('@');
    expect(blurredRows()).toEqual([rows()[1]]);
    const blurredTexts = [...rows()[1].querySelectorAll(`.${styles.blurred}`)].map(el => el.textContent);
    expect(blurredTexts).toEqual(['Whitney']);
    expect(rows()[2].textContent).toContain('Whitney');
  });

  it('link draw: blurs every drawn recipient when organizerMatched is false', async () => {
    await renderWith([linkDraw({
      organizerMatched: false,
      results: [
        {giverName: 'Alex', hasDrawn: false, recipientName: null, recipientIsYou: false},
        {giverName: 'Whitney', hasDrawn: true, recipientName: 'Hunter', recipientIsYou: false},
        {giverName: 'Hunter', hasDrawn: true, recipientName: 'Whitney', recipientIsYou: false},
      ],
    })]);

    expect(blurredRows()).toEqual([rows()[1], rows()[2]]);
    const blurredTexts = blurredRows().map(r => [...r.querySelectorAll(`.${styles.blurred}`)].map(el => el.textContent));
    expect(blurredTexts).toEqual([['Hunter'], ['Whitney']]);

    rows()[1].querySelector('.reveal-btn').click();
    expect(blurredRows()).toEqual([rows()[2]]);
  });

  it('escapes names and emails', async () => {
    await renderWith([secretSanta({
      results: [{giverName: '<b>x</b>', giverEmail: '<b>e</b>@test.com', recipientName: '<b>y</b>', recipientEmail: '<b>r</b>@test.com', recipientIsYou: false}],
    })]);

    expect(section().querySelector('b')).toBeNull();
    expect(rows()[0].textContent).toContain('<b>x</b>');
    expect(rows()[0].textContent).toContain('<b>y</b>');
    expect(rows()[0].textContent).toContain('<b>r</b>@test.com');
  });

  it('labels the giver and recipient columns on each card', async () => {
    await renderWith([secretSanta(), linkDraw()]);

    cards().forEach(card => {
      const header = card.querySelector(`.${styles.header}`);
      expect([...header.children].map(el => el.textContent)).toEqual(['Giver', '', 'Recipient']);
    });
  });

  it('link draw: shows no emails', async () => {
    await renderWith([linkDraw()]);

    expect(section().querySelectorAll(`.${styles.email}`)).toHaveLength(0);
  });

  it('shows the error message when loading fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ok: false, status: 400, json: async () => ({error: 'Unauthorized'})});
    init();
    await flush();

    expect(navItem().hidden).toBe(true);
    expect(section().querySelector('.empty-state').textContent).toBe('Unauthorized');
  });
});
