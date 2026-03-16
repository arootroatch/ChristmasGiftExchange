import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, seedUsers} from './contractHelper.js';

describe('api-user-wishlist-put contract', () => {
    let handler, db, mongo;

    beforeAll(async () => {
        // Mock fetch for email notifications
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ok: true})));
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-user-wishlist-put.mjs');
        handler = module.handler;
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges'));
    afterAll(async () => {
        vi.unstubAllGlobals();
        await teardownMongo(mongo);
    });

    describe('request contract (FE → BE)', () => {
        it('accepts PUT with wishlists and wishItems', async () => {
            const user = makeUser({name: 'Alice', email: 'alice@test.com'});
            await seedUsers(db, user);

            // Mirrors: src/wishlistEdit/components/SaveButton.js:30-33
            const event = buildEvent('PUT', {
                path: `/.netlify/functions/api-user-wishlist-put/${user.token}`,
                body: {
                    wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                    wishItems: [{url: 'https://amazon.com/item', title: 'A Thing', price: '$15'}],
                },
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('accepts empty arrays for wishlists and wishItems', async () => {
            const user = makeUser({name: 'Alice', email: 'alice@test.com'});
            await seedUsers(db, user);

            const event = buildEvent('PUT', {
                path: `/.netlify/functions/api-user-wishlist-put/${user.token}`,
                body: {wishlists: [], wishItems: []},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('rejects wishlist with invalid URL', async () => {
            const user = makeUser({name: 'Alice', email: 'alice@test.com'});
            await seedUsers(db, user);

            const event = buildEvent('PUT', {
                path: `/.netlify/functions/api-user-wishlist-put/${user.token}`,
                body: {
                    wishlists: [{url: 'not-a-url', title: 'Bad'}],
                    wishItems: [],
                },
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains success and notifiedGivers', async () => {
            const user = makeUser({name: 'Alice', email: 'alice@test.com'});
            await seedUsers(db, user);

            const event = buildEvent('PUT', {
                path: `/.netlify/functions/api-user-wishlist-put/${user.token}`,
                body: {
                    wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                    wishItems: [],
                },
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            // FE doesn't currently use these fields but they're the contract
            expect(body).toHaveProperty('success');
            expect(body).toHaveProperty('notifiedGivers');
            expect(typeof body.success).toBe('boolean');
            expect(typeof body.notifiedGivers).toBe('boolean');
        });
    });
});
