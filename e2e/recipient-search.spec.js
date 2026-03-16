import {test, expect} from './fixtures.js';
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange} from './helpers.js';

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

    test('entering giver email shows giver name, recipient, and date', async ({page}) => {
        await page.goto('/');

        const emailInput = page.locator('#recipientSearch');
        const submitBtn = page.locator('#recipientSearchBtn');

        await emailInput.fill('alice@test.com');
        await submitBtn.click();

        const result = page.locator('#query');
        await expect(result).toContainText('Alice');
        await expect(result).toContainText('is buying a gift for');
        await expect(result).toContainText('Bob');
        await expect(result).toContainText('As of');
    });

    test('does not expose wishlist view link', async ({page}) => {
        await page.goto('/');

        await page.locator('#recipientSearch').fill('alice@test.com');
        await page.locator('#recipientSearchBtn').click();

        await expect(page.locator('#query')).toContainText('Bob');
        await expect(page.locator('#query a')).not.toBeVisible();
    });

    test('shows error for unknown email', async ({page}) => {
        await page.goto('/');

        await page.locator('#recipientSearch').fill('nobody@test.com');
        await page.locator('#recipientSearchBtn').click();

        const result = page.locator('#query');
        await expect(result).toContainText(/not found/i);
    });
});
