import {test, expect} from './fixtures.js';
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange, authenticateViaUI} from './helpers.js';

test.describe('Recipient Search', () => {
    let giver, recipient;

    test.beforeAll(async () => {
        await connectDB();
    });

    test.beforeEach(async () => {
        await cleanDB();

        giver = makeUser({name: 'Alice', email: 'alice@test.com'});
        recipient = makeUser({
            name: 'Bob',
            email: 'bob@test.com',
            wishlists: [{url: 'https://amazon.com/list', title: 'Bobs List'}],
        });

        await seedUsers(giver, recipient);
        await seedExchange(makeExchange({
            exchangeId: crypto.randomUUID(),
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));
    });

    test.afterAll(async () => {
        await disconnectDB();
    });

    test('entering giver email via auth gate shows giver name, recipient, and date', async ({page}) => {
        await page.goto('/');

        // Auth gate should be visible in the recipient search area
        await expect(page.locator('#auth-gate')).toBeVisible();

        // Authenticate via the auth gate UI
        await authenticateViaUI(page, 'alice@test.com');

        // After auth, recipient search result appears
        const result = page.locator('#query');
        await expect(result).toContainText('Alice');
        await expect(result).toContainText('is buying a gift for');
        await expect(result).toContainText('Bob');
        await expect(result).toContainText('As of');
    });

    test('does not expose wishlist view link', async ({page}) => {
        await page.goto('/');

        await authenticateViaUI(page, 'alice@test.com');

        await expect(page.locator('#query')).toContainText('Bob');
        await expect(page.locator('#query a')).not.toBeVisible();
    });

    test('shows error for email with no exchange', async ({page}) => {
        // Seed a user so auth verification succeeds, but they have no exchange
        const nobody = makeUser({name: 'Nobody', email: 'nobody@test.com'});
        await seedUsers(nobody);

        await page.goto('/');

        await authenticateViaUI(page, 'nobody@test.com');

        // Error message appears briefly before auth gate re-renders
        const result = page.locator('#query');
        await expect(result).toContainText(/no exchange found/i);
    });
});
