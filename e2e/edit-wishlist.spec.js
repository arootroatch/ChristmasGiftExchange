import {test, expect} from './fixtures.js';
import {connectDB, disconnectDB, cleanDB, makeUser, makeExchange, seedUsers, seedExchange, authenticateUser} from './helpers.js';

test.describe('Edit Wishlist → Giver Sees Updates', () => {
    let giver, recipient, exchangeId;

    test.beforeAll(async () => {
        await connectDB();
    });

    test.beforeEach(async () => {
        await cleanDB();

        giver = makeUser({name: 'Alice', email: 'alice@test.com'});
        recipient = makeUser({name: 'Bob', email: 'bob@test.com'});
        exchangeId = crypto.randomUUID();

        await seedUsers(giver, recipient);
        await seedExchange(makeExchange({
            exchangeId,
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));
    });

    test.afterAll(async () => {
        await disconnectDB();
    });

    test('recipient edits wishlist and giver sees the updates', async ({page, baseURL}) => {
        // Authenticate as Bob (recipient) and navigate to wishlist edit
        await authenticateUser(page, baseURL, 'bob@test.com');
        await page.goto('/wishlist/edit');
        await expect(page.locator('#greeting')).toContainText('Bob');

        await page.locator('#wishlist-url').fill('https://amazon.com/wishlist/123');
        await page.locator('#wishlist-title').fill('My Amazon List');
        await page.locator('#add-wishlist-btn').click();
        await expect(page.locator('#wishlists-list')).toContainText('My Amazon List');

        await page.locator('#item-url').fill('https://amazon.com/product/456');
        await page.locator('#item-title').fill('Cool Gadget');
        await page.locator('#item-price').fill('$29.99');
        await page.locator('#add-item-btn').click();
        await expect(page.locator('#items-list')).toContainText('Cool Gadget');

        await page.locator('#save-wishlist-btn').click();
        await expect(page.locator('#snackbar')).toContainText('Wishlist saved');

        // Authenticate as Alice (giver) and view Bob's wishlist
        await authenticateUser(page, baseURL, 'alice@test.com');
        await page.goto(`/wishlist/view?exchange=${exchangeId}`);
        await expect(page.locator('#heading')).toContainText("Bob's Wishlist");

        const content = page.locator('#wishlist-content');
        await expect(content).toContainText('My Amazon List');
        await expect(content).toContainText('Cool Gadget');
    });
});
