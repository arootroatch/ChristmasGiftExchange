import {test, expect} from '@playwright/test';
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange} from './helpers.js';

test.describe('Reuse Exchange', () => {
    let alice, bob;

    test.beforeAll(async () => {
        await connectDB();
    });

    test.beforeEach(async () => {
        await cleanDB();

        alice = makeUser({name: 'Alice', email: 'alice@test.com'});
        bob = makeUser({name: 'Bob', email: 'bob@test.com'});

        await seedUsers(alice, bob);
        await seedExchange(makeExchange({
            exchangeId: 'reuse-ex-1',
            isSecretSanta: true,
            participants: [alice._id, bob._id],
            assignments: [
                {giverId: alice._id, recipientId: bob._id},
                {giverId: bob._id, recipientId: alice._id},
            ],
            houses: [{name: 'Family', members: [alice._id, bob._id]}],
            createdAt: new Date('2025-12-25'),
        }));
    });

    test.afterAll(async () => {
        await disconnectDB();
    });

    test('search by email shows past exchange details', async ({page}) => {
        await page.goto('/reuse');

        // Enter email and search
        await page.locator('#reuse-email').fill('alice@test.com');
        await page.locator('#reuse-search-btn').click();

        // Wait for results
        const results = page.locator('#results-section');
        await expect(results).toContainText('Alice', {timeout: 10000});
        await expect(results).toContainText('Bob');
        await expect(results).toContainText('Family');
    });

    test('shows error snackbar when no exchanges found', async ({page}) => {
        await page.goto('/reuse');

        await page.locator('#reuse-email').fill('nobody@test.com');
        await page.locator('#reuse-search-btn').click();

        await expect(page.locator('#snackbar')).toContainText('No past exchanges found', {timeout: 10000});
    });

    test('Use This Exchange button stores data in sessionStorage', async ({page}) => {
        await page.goto('/reuse');

        await page.locator('#reuse-email').fill('alice@test.com');
        await page.locator('#reuse-search-btn').click();

        // Wait for results to render
        await expect(page.locator('.use-exchange-btn')).toBeVisible({timeout: 10000});

        // Prevent navigation so sessionStorage can be inspected before the exchange page consumes it
        await page.evaluate(() => {
            window._navigatedTo = null;
            window.location.assign = (url) => { window._navigatedTo = url; };
            window.location.replace = (url) => { window._navigatedTo = url; };
        });

        // Intercept the href setter by capturing the click handler's effect
        const [stored] = await Promise.all([
            page.evaluate(() => new Promise(resolve => {
                const origSetItem = sessionStorage.setItem.bind(sessionStorage);
                sessionStorage.setItem = (key, value) => {
                    origSetItem(key, value);
                    if (key === 'reuseExchange') resolve(value);
                };
            })),
            page.locator('.use-exchange-btn').first().click(),
        ]);

        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored);
        expect(parsed.exchangeId).toBe('reuse-ex-1');
    });
});
