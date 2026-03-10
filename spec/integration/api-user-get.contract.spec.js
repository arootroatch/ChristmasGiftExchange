import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, seedUsers} from './contractHelper.js';

describe('api-user-get contract', () => {
    let handler, db, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-user-get.mjs');
        handler = module.handler;
    });

    afterEach(() => cleanCollections(db, 'users'));
    afterAll(() => teardownMongo(mongo));

    describe('request contract (FE → BE)', () => {
        it('accepts GET with token in path after "user"', async () => {
            const user = makeUser({name: 'Alice', email: 'alice@test.com'});
            await seedUsers(db, user);

            // Mirrors: src/wishlistEdit/index.js:24
            const event = buildEvent('GET', {
                path: `/.netlify/functions/api-user-get/${user.token}`,
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains name, wishlists, and wishItems', async () => {
            const user = makeUser({
                name: 'Alice',
                email: 'alice@test.com',
                wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                wishItems: [{url: 'https://amazon.com/item', title: 'A Thing'}],
            });
            await seedUsers(db, user);

            const event = buildEvent('GET', {
                path: `/.netlify/functions/api-user-get/${user.token}`,
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            // FE uses via setUserData() in src/wishlistEdit/index.js
            expect(body).toHaveProperty('name');
            expect(body).toHaveProperty('wishlists');
            expect(body).toHaveProperty('wishItems');
            expect(typeof body.name).toBe('string');
            expect(Array.isArray(body.wishlists)).toBe(true);
            expect(Array.isArray(body.wishItems)).toBe(true);
        });

        it('wishlists and wishItems have url and title', async () => {
            const user = makeUser({
                name: 'Alice',
                email: 'alice@test.com',
                wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                wishItems: [{url: 'https://amazon.com/item', title: 'A Thing'}],
            });
            await seedUsers(db, user);

            const event = buildEvent('GET', {
                path: `/.netlify/functions/api-user-get/${user.token}`,
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body.wishlists[0]).toHaveProperty('url');
            expect(body.wishlists[0]).toHaveProperty('title');
            expect(body.wishItems[0]).toHaveProperty('url');
            expect(body.wishItems[0]).toHaveProperty('title');
        });

        it('returns empty arrays for wishlists/wishItems when user has none', async () => {
            const user = makeUser({name: 'Alice', email: 'alice@test.com'});
            await seedUsers(db, user);

            const event = buildEvent('GET', {
                path: `/.netlify/functions/api-user-get/${user.token}`,
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body.wishlists).toEqual([]);
            expect(body.wishItems).toEqual([]);
        });
    });
});
