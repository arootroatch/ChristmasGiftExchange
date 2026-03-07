import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-user-get', () => {
    let client, db, handler;
    let mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const module = await import('../../netlify/functions/api-user-get.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it('returns 405 for non-GET requests', async () => {
        const event = {httpMethod: 'POST', path: '/api/user/some-token'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns user data by token', async () => {
        const alexToken = crypto.randomUUID();
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            token: alexToken,
            wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
            wishItems: [{url: 'https://amazon.com/item', title: 'Cool Thing'}],
        });

        const event = {
            httpMethod: 'GET',
            path: `/api/user/${alexToken}`,
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.name).toBe('Alex');
        expect(body.wishlists).toHaveLength(1);
        expect(body.wishlists[0].url).toBe('https://amazon.com/list');
        expect(body.wishItems).toHaveLength(1);
        expect(body.wishItems[0].title).toBe('Cool Thing');
    });

    it('returns empty arrays when user has no wishlists', async () => {
        const alexToken = crypto.randomUUID();
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            token: alexToken,
        });

        const event = {
            httpMethod: 'GET',
            path: `/api/user/${alexToken}`,
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.wishlists).toEqual([]);
        expect(body.wishItems).toEqual([]);
    });

    it('returns 401 for unknown token', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/api/user/nonexistent-token',
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(401);

        const body = JSON.parse(response.body);
        expect(body.error).toBe('User not found');
    });
});
