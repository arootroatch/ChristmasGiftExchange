import {test, expect} from './fixtures.js';
import {connectDB, disconnectDB, cleanDB} from './helpers.js';

test.describe('Names from a Hat (link-mode Secret Santa)', () => {
    test.beforeAll(async () => {
        await connectDB();
    });

    test.beforeEach(async () => {
        await cleanDB();
    });

    test.afterAll(async () => {
        await disconnectDB();
    });

    test('organizer creates a link exchange and a participant draws their name', async ({page, context}) => {
        await page.goto('/');
        await page.locator('#cookie-reject').click();
        await page.locator('#namesFromHatBtn').click();

        const nameInput = page.locator('#name-input');
        const addButton = page.locator('#add-name-btn');
        await expect(nameInput).toBeVisible();

        for (const name of ['Alex', 'Whitney']) {
            await nameInput.fill(name);
            await addButton.click();
        }

        await page.locator('#generate').click();

        // Link mode is Secret Santa internally, so GenerateButton hides itself and
        // LinkExchange's save-prompt appears directly — no ResultsTable/email-results-btn step.
        await expect(page.locator('#linkExchangeContainer')).toBeVisible();
        await page.locator('#linkSaveNoBtn').click();

        const linkInput = page.locator('#linkExchangeUrl');
        await expect(linkInput).toBeVisible();
        const drawUrl = await linkInput.inputValue();

        const drawPage = await context.newPage();
        await drawPage.goto(drawUrl);

        await drawPage.locator('[data-name="Alex"]').click();
        await drawPage.locator('#confirm-draw-btn').click();
        await expect(drawPage.locator('#draw-content')).toContainText('Whitney');

        // A fresh visit to the same link must show Alex's name as already drawn
        const redrawPage = await context.newPage();
        await redrawPage.goto(drawUrl);
        const alexButton = redrawPage.locator('[data-name="Alex"]');
        await expect(alexButton).toBeDisabled();
        await expect(alexButton).toContainText('Already viewed');
    });
});
