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

        // Click "Let's go!" to start the exchange
        await page.locator('#letsGo').click();

        // Step 1: Add participant names
        const nameInput = page.locator('#name-input');
        const addButton = page.locator('#add-name-btn');
        await expect(nameInput).toBeVisible();

        for (const name of names) {
            await nameInput.fill(name);
            await addButton.click();
        }

        // Click Next Step to advance past names (step 1 -> 2)
        await page.locator('#nextStep').click();

        // Click Next Step to advance past houses (step 2 -> 3)
        await page.locator('#nextStep').click();

        // Wait for Generate button to appear, then click it
        await expect(page.locator('#generate')).toBeVisible();
        await page.locator('#generate').click();

        // Click Next Step to advance to email table (step 3 -> 4)
        await page.locator('#nextStep').click();

        // Wait for email table to appear before filling
        await expect(page.locator('#emailTable')).toBeVisible({timeout: 5000});

        // Fill in emails — use click + pressSequentially to work around Verifalia widget
        const emailInputs = page.locator('#emailTableBody .emailInput');
        const count = await emailInputs.count();
        for (let i = 0; i < count; i++) {
            const input = emailInputs.nth(i);
            await input.click();
            await input.pressSequentially(`${names[i].toLowerCase()}@test.com`);
        }

        // Submit emails (saves exchange to DB)
        await page.locator('#submitEmails').click();

        // Wait for the "Send Emails" panel to appear
        await expect(page.locator('#sendEmailsBtn')).toBeVisible({timeout: 10000});

        // Send notification emails
        await page.locator('#sendEmailsBtn').click();

        // Wait for success snackbar
        await expect(page.locator('#snackbar')).toContainText(/Sent \d+ of \d+ emails successfully/i, {timeout: 10000});
    }

    test('full exchange creation flow creates exchange in DB', async ({page}) => {
        await createExchange(page, ['Alice', 'Bob', 'Carol']);

        // Verify exchange was created in DB
        const exchange = await findExchange({});
        expect(exchange).not.toBeNull();
        expect(exchange.participants).toHaveLength(3);
        expect(exchange.assignments).toHaveLength(3);
    });

    test('giver can view recipient wishlist page after exchange created', async ({page}) => {
        await createExchange(page, ['Alice', 'Bob']);

        // Get giver token and exchange from DB
        const giver = await findUser({email: 'alice@test.com'});
        const exchange = await findExchange({});

        expect(giver).not.toBeNull();
        expect(exchange).not.toBeNull();

        // Navigate to wishlist view
        await page.goto(`/wishlist/view/${giver.token}?exchange=${exchange.exchangeId}`);

        // Should show recipient's name in heading (wishlist is empty)
        const heading = page.locator('#heading');
        await expect(heading).toBeVisible({timeout: 10000});
        // The heading should contain the recipient's name + "'s Wishlist"
        await expect(heading).toContainText('Wishlist');

        // Should show empty wishlist message
        await expect(page.locator('#wishlist-content')).toContainText('No wishlist submitted yet');
    });
});
