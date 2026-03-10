import {test, expect} from '@playwright/test';
import {connectDB, disconnectDB, cleanDB, findUser, findExchange} from './helpers.js';

test.describe('Create Exchange → View Wishlist', () => {
    test.beforeAll(async () => {
        await connectDB();
    });

    test.beforeEach(async () => {
        await cleanDB();
    });

    test.afterAll(async () => {
        await disconnectDB();
    });

    async function createExchange(page, names) {
        await page.goto('/');
        await page.locator('#letsGo').click();

        const nameInput = page.locator('#name-input');
        const addButton = page.locator('#add-name-btn');
        await expect(nameInput).toBeVisible();

        for (const name of names) {
            await nameInput.fill(name);
            await addButton.click();
        }

        await page.locator('#nextStep').click();
        await page.locator('#nextStep').click();

        await expect(page.locator('#generate')).toBeVisible();
        await page.locator('#generate').click();

        await page.locator('#nextStep').click();

        await expect(page.locator('#emailTable')).toBeVisible({timeout: 5000});

        // pressSequentially works around Verifalia widget intercepting fill()
        const emailInputs = page.locator('#emailTableBody .emailInput');
        const count = await emailInputs.count();
        for (let i = 0; i < count; i++) {
            const input = emailInputs.nth(i);
            await input.click();
            await input.pressSequentially(`${names[i].toLowerCase()}@test.com`);
        }

        await page.locator('#submitEmails').click();
        await expect(page.locator('#sendEmailsBtn')).toBeVisible({timeout: 10000});
        await page.locator('#sendEmailsBtn').click();
        await expect(page.locator('#snackbar')).toContainText(/Sent \d+ of \d+ emails successfully/i, {timeout: 10000});
    }

    test('full exchange creation flow creates exchange in DB', async ({page}) => {
        await createExchange(page, ['Alice', 'Bob', 'Carol']);

        const exchange = await findExchange({});
        expect(exchange).not.toBeNull();
        expect(exchange.participants).toHaveLength(3);
        expect(exchange.assignments).toHaveLength(3);
    });

    test('giver can view recipient wishlist page after exchange created', async ({page}) => {
        await createExchange(page, ['Alice', 'Bob']);

        const giver = await findUser({email: 'alice@test.com'});
        const exchange = await findExchange({});
        expect(giver).not.toBeNull();
        expect(exchange).not.toBeNull();

        await page.goto(`/wishlist/view/${giver.token}?exchange=${exchange.exchangeId}`);

        const heading = page.locator('#heading');
        await expect(heading).toBeVisible({timeout: 10000});
        await expect(heading).toContainText('Wishlist');
        await expect(page.locator('#wishlist-content')).toContainText('No wishlist submitted yet');
    });
});
