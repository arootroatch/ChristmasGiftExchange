import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-exchange-get', () => {
    let client, db, handler;
    let mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const module = await import('../../netlify/functions/api-exchange-get.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    // Helper to set up a full exchange scenario
    async function setupExchange() {
        const giverId = new ObjectId();
        const recipientId = new ObjectId();
        const outsiderId = new ObjectId();
        const giverToken = crypto.randomUUID();
        const recipientToken = crypto.randomUUID();
        const outsiderToken = crypto.randomUUID();

        await db.collection('users').insertMany([
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: giverToken,
                wishlists: [],
                wishItems: [],
            },
            {
                _id: recipientId,
                email: 'recipient@test.com',
                name: 'Whitney',
                token: recipientToken,
                wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                wishItems: [{url: 'https://amazon.com/item', title: 'Cool Thing'}],
            },
            {
                _id: outsiderId,
                email: 'outsider@test.com',
                name: 'Outsider',
                token: outsiderToken,
                wishlists: [],
                wishItems: [],
            },
        ]);

        await db.collection('exchanges').insertOne({
            exchangeId: 'exchange-view',
            createdAt: new Date(),
            isSecretSanta: true,
            participants: [giverId, recipientId],
            assignments: [{giverId: giverId, recipientId: recipientId}],
            houses: [],
        });

        return {giverId, recipientId, outsiderId, giverToken, recipientToken, outsiderToken};
    }

    it('returns 405 for non-GET requests', async () => {
        const event = {httpMethod: 'POST', path: '/.netlify/functions/api-exchange-get/abc', queryStringParameters: {token: 'x'}};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns recipient wishlist data for valid giver', async () => {
        const {giverToken} = await setupExchange();

        const event = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api-exchange-get/exchange-view',
            queryStringParameters: {token: giverToken},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.recipientName).toBe('Whitney');
        expect(body.wishlists).toHaveLength(1);
        expect(body.wishlists[0].url).toBe('https://amazon.com/list');
        expect(body.wishItems).toHaveLength(1);
    });

    it('returns 403 for non-giver in exchange', async () => {
        const {outsiderToken} = await setupExchange();

        const event = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api-exchange-get/exchange-view',
            queryStringParameters: {token: outsiderToken},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(403);

        const body = JSON.parse(response.body);
        expect(body.error).toContain("don't have access");
    });

    it('returns 403 for unknown token', async () => {
        await setupExchange();

        const event = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api-exchange-get/exchange-view',
            queryStringParameters: {token: 'nonexistent-token'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(403);
    });

    it('returns 404 for missing exchange', async () => {
        const {giverToken} = await setupExchange();

        const event = {
            httpMethod: 'GET',
            path: '/.netlify/functions/api-exchange-get/nonexistent-exchange',
            queryStringParameters: {token: giverToken},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(404);

        const body = JSON.parse(response.body);
        expect(body.error).toBe('Exchange not found');
    });
});
