import {test, expect} from './fixtures.js';
import {alex, whitney, makeExchange, seedUsers, seedExchange} from '../spec/shared/testData.js';
import {connectDB, disconnectDB, cleanDB, getDB, authenticateUser} from './helpers.js';

test.describe('Edit Wishlist → Giver Sees Updates', () => {
    let exchangeId;

    test.beforeAll(async () => {
        await connectDB();
    });

    test.beforeEach(async () => {
        await cleanDB();

        exchangeId = crypto.randomUUID();

        await seedUsers(getDB(), alex, whitney);
        await seedExchange(getDB(), makeExchange({
            exchangeId,
            participants: [alex._id, whitney._id],
            assignments: [{giverId: alex._id, recipientId: whitney._id}],
        }));
    });

    test.afterAll(async () => {
        await disconnectDB();
    });

    test('recipient edits wishlist and giver sees the updates', async ({page, baseURL}) => {
        // Authenticate as Whitney (recipient) and navigate to dashboard
        await authenticateUser(page, baseURL, whitney.email);
        await page.goto('/dashboard/wishlist');
        await expect(page.locator('.sidebar-welcome')).toContainText('Whitney');

        // Wishlist section is active via path
        await page.locator('#wishlist-url').fill('https://amazon.com/wishlist/123');
        await page.locator('#wishlist-title').fill('My Amazon List');
        await page.locator('#add-wishlist-btn').click();
        await expect(page.locator('#wishlists-list')).toContainText('My Amazon List');

        await page.locator('#item-url').fill('https://amazon.com/product/456');
        await page.locator('#item-title').fill('Cool Gadget');
        await page.locator('#item-price').fill('29.99');
        await page.locator('#add-item-btn').click();
        await expect(page.locator('#items-list')).toContainText('Cool Gadget');

        await page.locator('#save-wishlist-btn').click();
        await expect(page.locator('#snackbar')).toContainText('Wishlist saved');

        // Authenticate as Alex (giver) and view Whitney's wishlist on the dashboard
        await authenticateUser(page, baseURL, alex.email);
        await page.goto('/dashboard');

        // Recipient wishlist auto-loads inline
        const content = page.locator('#recipient-wishlist-view');
        await expect(content).toContainText('My Amazon List');
        await expect(content).toContainText('Cool Gadget');
    });
});
