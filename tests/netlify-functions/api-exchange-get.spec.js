import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {MongoClient, ObjectId} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('api-exchange-get', () => {
    let mongoServer;
    let client;
    let handler;
    let originalEnv;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeAll(async () => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        originalEnv = {...process.env};

        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        process.env.MONGO_DB_URI = uri;
        process.env.MONGODB_DATABASE = 'test-db';

        client = new MongoClient(uri);
        await client.connect();

        const module = await import('../../netlify/functions/api-exchange-get.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        const db = client.db('test-db');
        await db.collection('users').deleteMany({});
        await db.collection('exchanges').deleteMany({});
    });

    afterAll(async () => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        process.env = originalEnv;
        await client.close();
        await mongoServer.stop();
    });

    // Helper to set up a full exchange scenario
    async function setupExchange() {
        const db = client.db('test-db');
        const giverId = new ObjectId();
        const recipientId = new ObjectId();
        const outsiderId = new ObjectId();

        await db.collection('users').insertMany([
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: 'dcb7622e-56a5-4f0c-a991-8644b5539e8d',
                wishlists: [],
                wishItems: [],
            },
            {
                _id: recipientId,
                email: 'recipient@test.com',
                name: 'Whitney',
                token: '985dec2e-d843-418d-bf64-897de3444a3a',
                wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                wishItems: [{url: 'https://amazon.com/item', title: 'Cool Thing'}],
            },
            {
                _id: outsiderId,
                email: 'outsider@test.com',
                name: 'Outsider',
                token: '71e95b93-6a56-4113-98fb-efdd6718a756',
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

        return {giverId, recipientId, outsiderId};
    }

    it('returns 405 for non-GET requests', async () => {
        const event = {httpMethod: 'POST', path: '/api/exchange/abc', queryStringParameters: {token: 'x'}};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns recipient wishlist data for valid giver', async () => {
        await setupExchange();

        const event = {
            httpMethod: 'GET',
            path: '/api/exchange/exchange-view',
            queryStringParameters: {token: 'dcb7622e-56a5-4f0c-a991-8644b5539e8d'},
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
        await setupExchange();

        const event = {
            httpMethod: 'GET',
            path: '/api/exchange/exchange-view',
            queryStringParameters: {token: '71e95b93-6a56-4113-98fb-efdd6718a756'},
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
            path: '/api/exchange/exchange-view',
            queryStringParameters: {token: 'nonexistent-token'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(403);
    });

    it('returns 404 for missing exchange', async () => {
        await setupExchange();

        const event = {
            httpMethod: 'GET',
            path: '/api/exchange/nonexistent-exchange',
            queryStringParameters: {token: 'dcb7622e-56a5-4f0c-a991-8644b5539e8d'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(404);

        const body = JSON.parse(response.body);
        expect(body.error).toBe('Exchange not found');
    });
});
