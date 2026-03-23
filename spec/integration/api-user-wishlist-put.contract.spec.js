import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, seedUsers} from './contractHelper.js';

describe('api-user-wishlist-put contract', () => {
    let handler, db, mongo;

    async function authCookie(userId) {
        const {signSession} = await import("../../netlify/shared/jwt.mjs");
        return `session=${await signSession(userId.toString())}`;
    }

    beforeAll(async () => {
        // Mock fetch for email notifications
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ok: true})));
        process.env.JWT_SECRET = 'test-secret';
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-user-wishlist-put.mjs');
        handler = module.handler;
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges', 'rateLimits'));
    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    describe('request contract (FE → BE)', () => {
        it('accepts PUT with cookie, wishlists and wishItems', async () => {
            const user = makeUser({name: 'Alice', email: 'alice@test.com'});
            await seedUsers(db, user);

            // Mirrors: src/wishlistEdit/components/SaveButton.js
            const event = buildEvent('PUT', {
                path: '/.netlify/functions/api-user-wishlist-put',
                body: {
                    wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                    wishItems: [{url: 'https://amazon.com/item', title: 'A Thing', price: '$15'}],
                },
                headers: {cookie: await authCookie(user._id)},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('accepts empty arrays for wishlists and wishItems', async () => {
            const user = makeUser({name: 'Alice', email: 'alice@test.com'});
            await seedUsers(db, user);

            const event = buildEvent('PUT', {
                path: '/.netlify/functions/api-user-wishlist-put',
                body: {wishlists: [], wishItems: []},
                headers: {cookie: await authCookie(user._id)},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('rejects wishlist with invalid URL', async () => {
            const user = makeUser({name: 'Alice', email: 'alice@test.com'});
            await seedUsers(db, user);

            const event = buildEvent('PUT', {
                path: '/.netlify/functions/api-user-wishlist-put',
                body: {
                    wishlists: [{url: 'not-a-url', title: 'Bad'}],
                    wishItems: [],
                },
                headers: {cookie: await authCookie(user._id)},
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
                path: '/.netlify/functions/api-user-wishlist-put',
                body: {
                    wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                    wishItems: [],
                },
                headers: {cookie: await authCookie(user._id)},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('success');
            expect(body).toHaveProperty('notifiedGivers');
            expect(typeof body.success).toBe('boolean');
            expect(typeof body.notifiedGivers).toBe('boolean');
        });
    });
});
