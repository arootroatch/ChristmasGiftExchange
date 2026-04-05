import {test, expect} from './fixtures.js';
import {alex, whitney, makeUser, makeExchange, seedUsers, seedExchange} from '../spec/shared/testData.js';
import {connectDB, disconnectDB, cleanDB, getDB, authenticateUser, authenticateViaUI} from './helpers.js';

test.describe('Reuse Exchange', () => {
    let exchangeId;

    test.beforeAll(async () => {
        await connectDB();
    });

    test.beforeEach(async () => {
        await cleanDB();

        exchangeId = crypto.randomUUID();

        await seedUsers(getDB(), alex, whitney);
        await seedExchange(getDB(), makeExchange({
            exchangeId,
            isSecretSanta: true,
            participants: [alex._id, whitney._id],
            assignments: [
                {giverId: alex._id, recipientId: whitney._id},
                {giverId: whitney._id, recipientId: alex._id},
            ],
            houses: [{name: 'Family', members: [alex._id, whitney._id]}],
            createdAt: new Date('2025-12-25'),
        }));
    });

    test.afterAll(async () => {
        await disconnectDB();
    });

    test('auto-loads past exchange details with Households label', async ({page, baseURL}) => {
        await page.goto('/dashboard/reuse');

        // Auth gate appears first
        await expect(page.locator('#auth-gate')).toBeVisible();
        await authenticateViaUI(page, alex.email);

        // Exchanges auto-load
        const results = page.locator('#reuse-results');
        await expect(results).toContainText('Alex');
        await expect(results).toContainText('Whitney');
        await expect(results).toContainText('Households:');
        await expect(results).toContainText('Family');
    });

    test('shows inline empty state when no exchanges found', async ({page, baseURL}) => {
        // Seed a user who has no exchanges
        const carol = makeUser({name: 'Carol', email: 'carol@test.com'});
        await seedUsers(getDB(), carol);

        await page.goto('/dashboard/reuse');
        await expect(page.locator('#auth-gate')).toBeVisible();
        await authenticateViaUI(page, 'carol@test.com');

        await expect(page.locator('#reuse-results')).toContainText('No past exchanges found');
    });

    test('Use This Exchange button stores data in sessionStorage', async ({page, baseURL}) => {
        await page.goto('/dashboard/reuse');
        await expect(page.locator('#auth-gate')).toBeVisible();
        await authenticateViaUI(page, alex.email);

        // Exchanges auto-load
        await expect(page.locator('.use-exchange-btn')).toBeVisible();

        // Intercept sessionStorage.setItem before click — the home page consumes and removes the item on load
        const storedPromise = page.evaluate(() => new Promise(resolve => {
            const origSetItem = sessionStorage.setItem.bind(sessionStorage);
            sessionStorage.setItem = (key, value) => {
                origSetItem(key, value);
                if (key === 'reuseExchange') resolve(value);
            };
        }));

        await page.locator('.use-exchange-btn').first().click();
        const stored = await storedPromise;

        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored);
        expect(parsed.exchangeId).toBe(exchangeId);
    });

    test('reusing exchange populates participants, houses, and ghost house', async ({page, baseURL}) => {
        await page.goto('/dashboard/reuse');
        await expect(page.locator('#auth-gate')).toBeVisible();
        await authenticateViaUI(page, alex.email);

        // Exchanges auto-load
        await expect(page.locator('.use-exchange-btn')).toBeVisible();

        await page.locator('.use-exchange-btn').first().click();
        await page.waitForURL('/');

        // Participants should be loaded
        await expect(page.locator('#wrapper-Alex')).toBeVisible();
        await expect(page.locator('#wrapper-Whitney')).toBeVisible();

        // House should appear with correct name
        const house = page.locator('[data-testid="household"]').first();
        await expect(house).toBeVisible();
        await expect(house.locator('h2')).toContainText('Family');

        // Ghost house minimal template should be visible
        await expect(page.locator('#ghost-house')).toBeVisible();
        await expect(page.locator('.ghost-house-btn')).toContainText('Add another House');
    });
});
