import {test, expect} from './fixtures.js';
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange, authenticateUser, authenticateViaUI} from './helpers.js';

test.describe('Auth Flow', () => {
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
            participants: [alice._id, bob._id],
            assignments: [{giverId: alice._id, recipientId: bob._id}],
        }));
    });

    test.afterAll(async () => {
        await disconnectDB();
    });

    test('unauthenticated wishlist edit page shows auth gate on 401', async ({page}) => {
        await page.goto('/wishlist/edit');

        // The page tries to load user data, gets 401, shows auth gate
        await expect(page.locator('#auth-gate')).toBeVisible();
        await expect(page.locator('#auth-send-code')).toBeVisible();
    });

    test('unauthenticated wishlist view page shows auth gate on 401', async ({page}) => {
        await page.goto(`/wishlist/view?exchange=${exchangeId}`);

        // The page tries to load wishlist, gets 401, shows auth gate
        await expect(page.locator('#auth-gate')).toBeVisible();
        await expect(page.locator('#auth-send-code')).toBeVisible();
    });

    test('legacy link with ?user= shows expired message and auth gate', async ({page}) => {
        await page.goto('/wishlist/edit?user=some-old-token');

        await expect(page.locator('.auth-message')).toContainText('This link has expired');
        await expect(page.locator('#auth-gate')).toBeVisible();
    });

    test('legacy link on wishlist view shows expired message and auth gate', async ({page}) => {
        await page.goto(`/wishlist/view?user=some-old-token&exchange=${exchangeId}`);

        await expect(page.locator('.auth-message')).toContainText('This link has expired');
        await expect(page.locator('#auth-gate')).toBeVisible();
    });

    test('auth gate sends code and accepts verification on wishlist edit', async ({page}) => {
        await page.goto('/wishlist/edit');
        await expect(page.locator('#auth-gate')).toBeVisible();

        // Authenticate via the auth gate UI
        await authenticateViaUI(page, 'bob@test.com');

        // After auth, the page reloads content and shows greeting
        await expect(page.locator('#greeting')).toContainText('Bob');
    });

    test('auth gate sends code and accepts verification on wishlist view', async ({page}) => {
        await page.goto(`/wishlist/view?exchange=${exchangeId}`);
        await expect(page.locator('#auth-gate')).toBeVisible();

        // Authenticate as Alice (giver)
        await authenticateViaUI(page, 'alice@test.com');

        // After auth, the wishlist content loads
        const heading = page.locator('#heading');
        await expect(heading).toBeVisible();
        await expect(heading).toContainText('Wishlist');
    });

    test('programmatic auth allows direct page access', async ({page, baseURL}) => {
        // Authenticate programmatically
        await authenticateUser(page, baseURL, 'bob@test.com');

        await page.goto('/wishlist/edit');

        // Should skip auth gate and go directly to content
        await expect(page.locator('#greeting')).toContainText('Bob');
    });
});
