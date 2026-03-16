import {test, expect} from './fixtures.js';
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

        await expect(page.locator('#generate')).toBeVisible();
        await page.locator('#generate').click();

        await expect(page.locator('#email-results-btn')).toBeVisible();
        await page.locator('#email-results-btn').click();

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
        await expect(page.locator('#snackbar')).toContainText('Exchange saved and emails sent!');
    }

    test('full exchange creation flow creates exchange in DB', async ({page}) => {
        await createExchange(page, ['Alice', 'Bob', 'Carol']);

        const exchange = await findExchange({});
        expect(exchange).not.toBeNull();
        expect(exchange.participants).toHaveLength(3);
        expect(exchange.assignments).toHaveLength(3);
    });

    test('Send Me Results back button returns to email table', async ({page}) => {
        await page.goto('/');
        await page.locator('#letsGo').click();

        const nameInput = page.locator('#name-input');
        const addButton = page.locator('#add-name-btn');
        await expect(nameInput).toBeVisible();

        for (const name of ['Alice', 'Bob', 'Carol']) {
            await nameInput.fill(name);
            await addButton.click();
        }

        await page.locator('#generate').click();
        await expect(page.locator('#email-results-btn')).toBeVisible();
        await page.locator('#email-results-btn').click();
        await expect(page.locator('#emailTable')).toBeVisible();

        // Click "Send Me the Results"
        await page.locator('#sendResultsBtn').click();

        // Confirmation modal appears
        await expect(page.locator('#sendResultsConfirm')).toBeVisible();

        // Cancel dismisses confirmation
        await page.locator('#sendResultsCancelBtn').click();
        await expect(page.locator('#sendResultsConfirm')).not.toBeVisible();
        await expect(page.locator('#emailTable')).toBeVisible();

        // Go through again — Continue to results form
        await page.locator('#sendResultsBtn').click();
        await page.locator('#sendResultsConfirmBtn').click();

        // Results form appears with back button
        await expect(page.locator('#sendResults')).toBeVisible();
        await expect(page.locator('#sendResultsBackBtn')).toBeVisible();

        // Back button returns to email table
        await page.locator('#sendResultsBackBtn').click();
        await expect(page.locator('#sendResults')).not.toBeVisible();
        await expect(page.locator('#emailTable')).toBeVisible();
    });

    test('moving name into house via dropdown removes it from participants', async ({page}) => {
        await page.goto('/');
        await page.locator('#letsGo').click();

        const nameInput = page.locator('#name-input');
        const addButton = page.locator('#add-name-btn');
        await expect(nameInput).toBeVisible();

        for (const name of ['Alice', 'Bob', 'Carol']) {
            await nameInput.fill(name);
            await addButton.click();
        }

        // Ghost house should appear after 3 names
        await expect(page.locator('#ghost-house')).toBeVisible();

        // Add a house
        await page.locator('.ghost-house-btn').click();
        const house = page.locator('.household').first();
        await expect(house).toBeVisible();

        // Move Alice into the house via dropdown
        await house.locator('select').selectOption('Alice');

        // Alice should now be in the house, not in the participants list
        await expect(house.locator('#wrapper-Alice')).toBeVisible();
        await expect(page.locator('#name-list #wrapper-Alice')).not.toBeVisible();
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
