import {test, expect} from './fixtures.js';
import {alex, makeUser, makeExchange, seedUsers, seedExchange} from '../spec/shared/testData.js';
import {connectDB, disconnectDB, cleanDB, getDB, authenticateViaUI} from './helpers.js';

test.describe('Recipient Search', () => {
    let recipient;

    test.beforeAll(async () => {
        await connectDB();
    });

    test.beforeEach(async () => {
        await cleanDB();

        recipient = makeUser({
            name: 'Bob',
            email: 'bob@test.com',
            wishlists: [{url: 'https://amazon.com/list', title: 'Bobs List'}],
        });

        await seedUsers(getDB(), alex, recipient);
        await seedExchange(getDB(), makeExchange({
            exchangeId: crypto.randomUUID(),
            participants: [alex._id, recipient._id],
            assignments: [{giverId: alex._id, recipientId: recipient._id}],
        }));
    });

    test.afterAll(async () => {
        await disconnectDB();
    });

    test('entering giver email via auth gate shows giver name, recipient, and date', async ({page}) => {
        await page.goto('/dashboard');

        // Auth gate should be visible on the dashboard
        await expect(page.locator('#auth-gate')).toBeVisible();

        // Authenticate via the auth gate UI
        await authenticateViaUI(page, alex.email);

        // After auth, recipient card shows the result
        const result = page.locator('#recipient-card');
        await expect(result).toContainText('buying a gift for');
        await expect(result).toContainText('Bob');
        await expect(result).toContainText('As of');
    });

    test('recipient wishlist auto-loads on dashboard', async ({page}) => {
        await page.goto('/dashboard');

        await authenticateViaUI(page, alex.email);

        await expect(page.locator('#recipient-card')).toContainText('Bob');
        // Wishlist auto-loads inline
        const wishlistView = page.locator('#recipient-wishlist-view');
        await expect(wishlistView).toContainText('Bobs List');
    });

    test('shows message for email with no exchange', async ({page}) => {
        // Seed a user so auth verification succeeds, but they have no exchange
        const nobody = makeUser({name: 'Nobody', email: 'nobody@test.com'});
        await seedUsers(getDB(), nobody);

        await page.goto('/dashboard');

        await authenticateViaUI(page, 'nobody@test.com');

        // No exchange message appears in recipient card area
        const result = page.locator('#recipient-card');
        await expect(result).toContainText(/no exchange found/i);
    });
});
