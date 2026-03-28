import {test, expect} from './fixtures.js';
import {connectDB, disconnectDB, cleanDB, findUser, findExchange, makeUser, makeExchange, seedUsers, seedExchange, authenticateUser, authenticateViaUI} from './helpers.js';

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
        await page.locator('#cookie-reject').click();
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

        // ResultsTable appears with Email Results button
        await expect(page.locator('#email-results-btn')).toBeVisible();
        await page.locator('#email-results-btn').click();

        // OrganizerForm auth gate appears — authenticate via UI
        await expect(page.locator('#auth-gate')).toBeVisible();
        const organizerEmail = `${names[0].toLowerCase()}@test.com`;
        await authenticateViaUI(page, organizerEmail, names[0]);

        // After auth, EmailTable appears
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
        await expect(page.locator('#completionModal')).toContainText('Your exchange has been saved and emails have been sent');
    }

    test('full exchange creation flow creates exchange in DB', async ({page}) => {
        await createExchange(page, ['Alice', 'Bob', 'Carol']);

        const exchange = await findExchange({});
        expect(exchange).not.toBeNull();
        expect(exchange.participants).toHaveLength(3);
        expect(exchange.assignments).toHaveLength(3);
    });

    test('Send Me Results cancel returns to email table', async ({page}) => {
        await page.goto('/');
        await page.locator('#cookie-reject').click();
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

        // OrganizerForm auth gate — authenticate
        await expect(page.locator('#auth-gate')).toBeVisible();
        await authenticateViaUI(page, 'alice@test.com', 'Alice');

        // EmailTable appears
        await expect(page.locator('#emailTable')).toBeVisible();

        // Click "Send Me the Results"
        await page.locator('#sendResultsBtn').click();

        // Confirmation modal appears
        await expect(page.locator('#sendResultsConfirm')).toBeVisible();

        // Cancel dismisses confirmation
        await page.locator('#sendResultsCancelBtn').click();
        await expect(page.locator('#sendResultsConfirm')).not.toBeVisible();
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
        const house = page.locator('[data-testid="household"]').first();
        await expect(house).toBeVisible();

        // Move Alice into the house via dropdown
        await house.locator('select').selectOption('Alice');

        // Alice should now be in the house, not in the participants list
        await expect(house.locator('#wrapper-Alice')).toBeVisible();
        await expect(page.locator('#name-list #wrapper-Alice')).not.toBeVisible();
    });

    test('giver can view recipient wishlist on dashboard', async ({page, baseURL}) => {
        const giver = makeUser({name: 'Alice', email: 'alice@test.com'});
        const recipient = makeUser({name: 'Bob', email: 'bob@test.com'});
        const exchangeId = crypto.randomUUID();

        await seedUsers(giver, recipient);
        await seedExchange(makeExchange({
            exchangeId,
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));

        // Authenticate as Alice programmatically
        await authenticateUser(page, baseURL, 'alice@test.com');

        await page.goto('/dashboard');

        // Recipient card shows Bob and the empty wishlist message
        const recipientCard = page.locator('#recipient-card');
        await expect(recipientCard).toContainText('Bob');
        await expect(page.locator('#recipient-wishlist-view')).toContainText("hasn't added any wishlists yet");
    });
});
