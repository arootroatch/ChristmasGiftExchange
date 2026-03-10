import {test, expect} from '@playwright/test';
import {connectDB, disconnectDB, cleanDB, findUser, findExchange, makeUser, makeExchange, seedUsers, seedExchange} from './helpers.js';

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

        await expect(page.locator('#emailTable')).toBeVisible();

        // pressSequentially works around Verifalia widget intercepting fill()
        const emailInputs = page.locator('#emailTableBody .emailInput');
        const count = await emailInputs.count();
        for (let i = 0; i < count; i++) {
            const input = emailInputs.nth(i);
            await input.click();
            await input.pressSequentially(`${names[i].toLowerCase()}@test.com`);
        }

        await page.locator('#submitEmails').click();
        await expect(page.locator('#sendEmailsBtn')).toBeVisible();
        await page.locator('#sendEmailsBtn').click();
        await expect(page.locator('#snackbar')).toContainText(/Sent \d+ of \d+ emails successfully/i);
    }

    test('full exchange creation flow creates exchange in DB', async ({page}) => {
        await createExchange(page, ['Alice', 'Bob', 'Carol']);

        const exchange = await findExchange({});
        expect(exchange).not.toBeNull();
        expect(exchange.participants).toHaveLength(3);
        expect(exchange.assignments).toHaveLength(3);
    });

    test('giver can view recipient wishlist page', async ({page}) => {
        const giver = makeUser({name: 'Alice', email: 'alice@test.com'});
        const recipient = makeUser({name: 'Bob', email: 'bob@test.com'});
        const exchangeId = crypto.randomUUID();

        await seedUsers(giver, recipient);
        await seedExchange(makeExchange({
            exchangeId,
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));

        await page.goto(`/wishlist/view/${giver.token}?exchange=${exchangeId}`);

        const heading = page.locator('#heading');
        await expect(heading).toBeVisible();
        await expect(heading).toContainText('Wishlist');
        await expect(page.locator('#wishlist-content')).toContainText('No wishlist submitted yet');
    });
});
