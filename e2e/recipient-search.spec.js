import {test, expect} from '@playwright/test';
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange} from './helpers.js';

test.describe('Email Query', () => {
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

    test('entering giver email shows recipient name', async ({page}) => {
        await page.goto('/');

        const emailInput = page.locator('#emailQuery');
        const submitBtn = page.locator('#emailQueryBtn');

        await emailInput.fill('alice@test.com');
        await submitBtn.click();

        const result = page.locator('#query');
        await expect(result).toContainText('Bob');
    });

    test('shows wishlist view link when recipient has wishlist', async ({page}) => {
        await page.goto('/');

        await page.locator('#emailQuery').fill('alice@test.com');
        await page.locator('#emailQueryBtn').click();

        const link = page.locator('#query a');
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', /\/wishlist\/view\//);
    });

    test('shows error for unknown email', async ({page}) => {
        await page.goto('/');

        await page.locator('#emailQuery').fill('nobody@test.com');
        await page.locator('#emailQueryBtn').click();

        const result = page.locator('#query');
        await expect(result).toContainText(/not found/i);
    });
});
