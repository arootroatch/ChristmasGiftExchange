import {test, expect} from './fixtures.js';
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange, authenticateUser, authenticateViaUI} from './helpers.js';

test.describe('Reuse Exchange', () => {
    let alice, bob, exchangeId;

    test.beforeAll(async () => {
        await connectDB();
    });

    test.beforeEach(async () => {
        await cleanDB();

        alice = makeUser({name: 'Alice', email: 'alice@test.com'});
        bob = makeUser({name: 'Bob', email: 'bob@test.com'});
        exchangeId = crypto.randomUUID();

        await seedUsers(alice, bob);
        await seedExchange(makeExchange({
            exchangeId,
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

    test('search by email shows past exchange details with Households label', async ({page, baseURL}) => {
        await page.goto('/reuse');

        // Auth gate appears first
        await expect(page.locator('#auth-gate')).toBeVisible();
        await authenticateViaUI(page, 'alice@test.com');

        // Search section now visible
        await expect(page.locator('#reuse-search-btn')).toBeVisible();
        await page.locator('#reuse-search-btn').click();

        const results = page.locator('#results-section');
        await expect(results).toContainText('Alice');
        await expect(results).toContainText('Bob');
        await expect(results).toContainText('Households:');
        await expect(results).toContainText('Family');
    });

    test('shows error snackbar when no exchanges found', async ({page, baseURL}) => {
        // Seed a user who has no exchanges
        const carol = makeUser({name: 'Carol', email: 'carol@test.com'});
        await seedUsers(carol);

        await page.goto('/reuse');
        await expect(page.locator('#auth-gate')).toBeVisible();
        await authenticateViaUI(page, 'carol@test.com');

        await page.locator('#reuse-search-btn').click();
        await expect(page.locator('#snackbar')).toContainText('No past exchanges found');
    });

    test('Use This Exchange button stores data in sessionStorage', async ({page, baseURL}) => {
        await page.goto('/reuse');
        await authenticateViaUI(page, 'alice@test.com');

        await page.locator('#reuse-search-btn').click();
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
        await page.goto('/reuse');
        await authenticateViaUI(page, 'alice@test.com');

        await page.locator('#reuse-search-btn').click();
        await expect(page.locator('.use-exchange-btn')).toBeVisible();

        await page.locator('.use-exchange-btn').first().click();
        await page.waitForURL('/');

        // Participants should be loaded
        await expect(page.locator('#wrapper-Alice')).toBeVisible();
        await expect(page.locator('#wrapper-Bob')).toBeVisible();

        // House should appear with correct name
        const house = page.locator('.household').first();
        await expect(house).toBeVisible();
        await expect(house.locator('h2')).toContainText('Family');

        // Ghost house minimal template should be visible
        await expect(page.locator('#ghost-house')).toBeVisible();
        await expect(page.locator('.ghost-house-btn')).toContainText('Add another House');
    });
});
