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

    test('unauthenticated dashboard shows auth gate', async ({page}) => {
        await page.goto('/dashboard');

        // The page tries to load session, gets 401, shows auth gate
        await expect(page.locator('#auth-gate')).toBeVisible();
        await expect(page.locator('#auth-send-code')).toBeVisible();
    });

    test('auth gate sends code and accepts verification on dashboard', async ({page}) => {
        await page.goto('/dashboard');
        await expect(page.locator('#auth-gate')).toBeVisible();

        // Authenticate via the auth gate UI
        await authenticateViaUI(page, 'bob@test.com');

        // After auth, the dashboard loads with welcome message
        await expect(page.locator('.dashboard-welcome')).toContainText('Bob');
    });

    test('programmatic auth allows direct dashboard access', async ({page, baseURL}) => {
        // Authenticate programmatically
        await authenticateUser(page, baseURL, 'bob@test.com');

        await page.goto('/dashboard');

        // Should skip auth gate and go directly to dashboard content
        await expect(page.locator('.dashboard-welcome')).toContainText('Bob');
    });

    test('invalid verification code shows error', async ({page}) => {
        await page.goto('/dashboard');
        await expect(page.locator('#auth-gate')).toBeVisible();

        // Enter email and send code (intercepted so we control the code)
        await page.locator('#auth-email').fill('bob@test.com');
        await page.locator('#auth-send-code').click();
        await expect(page.locator('#auth-code')).toBeVisible();

        // Enter wrong code and verify
        await page.locator('#auth-code').fill('00000000');
        await page.locator('#auth-verify-code').click();

        // Should show error via snackbar, auth gate stays visible
        await expect(page.locator('#snackbar')).toBeVisible();
        await expect(page.locator('#auth-gate')).toBeVisible();
    });

    test('logout clears session and shows auth gate', async ({page, baseURL}) => {
        await authenticateUser(page, baseURL, 'bob@test.com');
        await page.goto('/dashboard');
        await expect(page.locator('.dashboard-welcome')).toContainText('Bob');

        // Dismiss cookie banner if present, then click logout in sidebar
        const banner = page.locator('#cookie-banner');
        if (await banner.isVisible()) {
            await banner.locator('#cookie-accept').click();
        }
        await page.locator('#sidebar-logout').click();

        // Page reloads and shows auth gate
        await expect(page.locator('#auth-gate')).toBeVisible();
    });

    test('/dashboard/wishlist deep link loads wishlist section', async ({page, baseURL}) => {
        await authenticateUser(page, baseURL, 'bob@test.com');

        await page.goto('/dashboard/wishlist');

        // Wishlist section should be visible
        await expect(page.locator('#section-wishlist')).toBeVisible();
        await expect(page.locator('#section-recipient')).toBeHidden();
    });

    test('browser back button navigates between sections', async ({page, baseURL}) => {
        await authenticateUser(page, baseURL, 'bob@test.com');
        await page.goto('/dashboard');
        await expect(page.locator('.dashboard-welcome')).toContainText('Bob');

        // Navigate to wishlist section
        await page.locator('[data-section="wishlist"]').click();
        await expect(page.locator('#section-wishlist')).toBeVisible();

        // Navigate to contact section
        await page.locator('[data-section="contact"]').click();
        await expect(page.locator('#section-contact')).toBeVisible();

        // Go back - should return to wishlist
        await page.goBack();
        await expect(page.locator('#section-wishlist')).toBeVisible();
    });
});
