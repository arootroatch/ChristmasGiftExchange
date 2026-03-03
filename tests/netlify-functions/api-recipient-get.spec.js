import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {MongoClient, ObjectId} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('api-recipient-get', () => {
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
        process.env.MONGODB_COLLECTION = 'legacy-names';

        client = new MongoClient(uri);
        await client.connect();

        const module = await import('../../netlify/functions/api-recipient-get.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        const db = client.db('test-db');
        await db.collection('users').deleteMany({});
        await db.collection('exchanges').deleteMany({});
        await db.collection('legacy-names').deleteMany({});
    });

    afterAll(async () => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        process.env = originalEnv;
        await client.close();
        await mongoServer.stop();
    });

    it('returns 405 for non-GET requests', async () => {
        const event = {httpMethod: 'POST', queryStringParameters: {email: 'a@b.com'}};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 when email is missing', async () => {
        const event = {httpMethod: 'GET', queryStringParameters: {}};
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('queries new collections and returns recipient with wishlist URL', async () => {
        const db = client.db('test-db');
        const giverId = new ObjectId();
        const recipientId = new ObjectId();

        await db.collection('users').insertMany([
            {
                _id: giverId,
                email: 'alex@test.com',
                name: 'Alex',
                token: 'giver-token',
                wishlists: [],
                wishItems: [],
            },
            {
                _id: recipientId,
                email: 'whitney@test.com',
                name: 'Whitney',
                token: 'recipient-token',
                wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                wishItems: [],
            },
        ]);

        await db.collection('exchanges').insertOne({
            exchangeId: 'exchange-new',
            createdAt: new Date('2025-12-01'),
            isSecretSanta: true,
            participants: [giverId, recipientId],
            assignments: [
                {giverId: giverId, recipientId: recipientId},
                {giverId: recipientId, recipientId: giverId},
            ],
            houses: [],
        });

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.recipient).toBe('Whitney');
        expect(body.date).toBeDefined();
        expect(body.wishlistViewUrl).toBe('/wishlist/view/giver-token?exchange=exchange-new');
    });

    it('does not include wishlist URL when recipient has no wishlist', async () => {
        const db = client.db('test-db');
        const giverId = new ObjectId();
        const recipientId = new ObjectId();

        await db.collection('users').insertMany([
            {
                _id: giverId,
                email: 'alex@test.com',
                name: 'Alex',
                token: 'giver-token-2',
                wishlists: [],
                wishItems: [],
            },
            {
                _id: recipientId,
                email: 'whitney@test.com',
                name: 'Whitney',
                token: 'recipient-token-2',
                wishlists: [],
                wishItems: [],
            },
        ]);

        await db.collection('exchanges').insertOne({
            exchangeId: 'exchange-no-wishlist',
            createdAt: new Date('2025-12-01'),
            isSecretSanta: true,
            participants: [giverId, recipientId],
            assignments: [{giverId: giverId, recipientId: recipientId}],
            houses: [],
        });

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.recipient).toBe('Whitney');
        expect(body.wishlistViewUrl).toBeUndefined();
    });

    it('falls back to legacy collection when not in new collections', async () => {
        const db = client.db('test-db');
        await db.collection('legacy-names').insertOne({
            email: 'old@test.com',
            recipient: 'Legacy Recipient',
            date: new Date('2023-12-01'),
        });

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'old@test.com'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.recipient).toBe('Legacy Recipient');
        expect(body.date).toBeDefined();
        expect(body.wishlistViewUrl).toBeUndefined();
    });

    it('returns 404 when not found in any collection', async () => {
        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'nobody@test.com'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(404);

        const body = JSON.parse(response.body);
        expect(body.error).toBe('Email not found');
    });

    it('returns most recent exchange from new collections', async () => {
        const db = client.db('test-db');
        const giverId = new ObjectId();
        const recipientId1 = new ObjectId();
        const recipientId2 = new ObjectId();

        await db.collection('users').insertMany([
            {_id: giverId, email: 'alex@test.com', name: 'Alex', token: 'giver-multi', wishlists: [], wishItems: []},
            {_id: recipientId1, email: 'old@test.com', name: 'Old Recipient', token: 'r1', wishlists: [], wishItems: []},
            {_id: recipientId2, email: 'new@test.com', name: 'New Recipient', token: 'r2', wishlists: [], wishItems: []},
        ]);

        await db.collection('exchanges').insertMany([
            {
                exchangeId: 'old-exchange',
                createdAt: new Date('2023-12-01'),
                isSecretSanta: true,
                participants: [giverId, recipientId1],
                assignments: [{giverId: giverId, recipientId: recipientId1}],
                houses: [],
            },
            {
                exchangeId: 'new-exchange',
                createdAt: new Date('2025-12-01'),
                isSecretSanta: true,
                participants: [giverId, recipientId2],
                assignments: [{giverId: giverId, recipientId: recipientId2}],
                houses: [],
            },
        ]);

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.recipient).toBe('New Recipient');
    });
});
