import {test, expect} from './fixtures.js';
import {connectDB, disconnectDB, cleanDB, getDB} from './helpers.js';

const NAMES = ['Alex', 'Whitney'];
const ORGANIZER = {name: 'New Organizer', email: 'new-organizer@test.com'};

test.describe('First-time organizer signs up through the auth gate', () => {
    test.beforeAll(async () => {
        await connectDB();
    });

    test.beforeEach(async () => {
        await cleanDB();
    });

    test.afterAll(async () => {
        await disconnectDB();
    });

    async function enterNamesAndGenerate(page, modeButton) {
        await page.goto('/');
        await page.locator('#cookie-reject').click();
        await page.locator(modeButton).click();

        for (const name of NAMES) {
            await page.locator('#name-input').fill(name);
            await page.locator('#add-name-btn').click();
        }
        await page.locator('#generate').click();
    }

    // Deliberately does not mock api-auth-code-post: that real request is what this spec guards.
    async function signUpThroughGate(page) {
        await expect(page.locator('#auth-gate')).toBeVisible();
        await page.locator('#auth-name').fill(ORGANIZER.name);
        await page.locator('#auth-email').fill(ORGANIZER.email);
        await page.locator('#auth-send-code').click();
        await expect(page.locator('#auth-code')).toBeVisible();

        const db = getDB();
        await expect.poll(() => db.collection('authCodes').countDocuments({email: ORGANIZER.email})).toBe(1);
        expect(await db.collection('users').findOne({email: ORGANIZER.email})).toBeNull();

        // Codes are stored hashed, so swap in one this test knows in order to finish verifying.
        const {generateAndStoreCode} = await import('../netlify/shared/authCodes.mjs');
        await page.locator('#auth-code').fill(await generateAndStoreCode(ORGANIZER.email));
        await page.locator('#auth-verify-code').click();
        await expect(page.locator('#auth-gate')).toHaveCount(0);

        const user = await db.collection('users').findOne({email: ORGANIZER.email});
        expect(user.name).toBe(ORGANIZER.name);
    }

    test('Quick Match, via Email Results', async ({page}) => {
        await enterNamesAndGenerate(page, '#letsGo');
        await page.locator('#email-results-btn').click();

        await signUpThroughGate(page);

        await expect(page.locator('#emailTable')).toBeVisible();
    });

    test('Secret Santa, right after drawing names', async ({page}) => {
        await enterNamesAndGenerate(page, '#secretSantaBtn');

        await signUpThroughGate(page);

        await expect(page.locator('#emailTable')).toBeVisible();
    });

    test('Names from a Hat, via saving the exchange', async ({page}) => {
        await enterNamesAndGenerate(page, '#namesFromHatBtn');
        await page.locator('#linkSaveYesBtn').click();

        await signUpThroughGate(page);

        await expect(page.locator('#linkExchangeUrl')).toBeVisible();
        const user = await getDB().collection('users').findOne({email: ORGANIZER.email});
        const saved = await getDB().collection('linkExchanges').findOne({organizer: user._id});
        expect(saved).not.toBeNull();
    });
});
