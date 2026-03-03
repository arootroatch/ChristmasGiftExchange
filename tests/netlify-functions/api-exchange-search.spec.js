import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {MongoClient, ObjectId} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('api-exchange-search', () => {
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

        const module = await import('../../netlify/functions/api-exchange-search.mjs');
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

    async function setupExchanges() {
        const db = client.db('test-db');
        const alexId = new ObjectId();
        const whitneyId = new ObjectId();
        const hunterId = new ObjectId();

        await db.collection('users').insertMany([
            {_id: alexId, email: 'alex@test.com', name: 'Alex', token: 'alex-token', wishlists: [], wishItems: []},
            {_id: whitneyId, email: 'whitney@test.com', name: 'Whitney', token: 'whitney-token', wishlists: [], wishItems: []},
            {_id: hunterId, email: 'hunter@test.com', name: 'Hunter', token: 'hunter-token', wishlists: [], wishItems: []},
        ]);

        await db.collection('exchanges').insertMany([
            {
                exchangeId: 'exchange-2024',
                createdAt: new Date('2024-12-01'),
                isSecretSanta: true,
                participants: [alexId, whitneyId, hunterId],
                assignments: [
                    {giverId: alexId, recipientId: whitneyId},
                    {giverId: whitneyId, recipientId: hunterId},
                    {giverId: hunterId, recipientId: alexId},
                ],
                houses: [{name: 'Family', members: [alexId, whitneyId]}],
            },
            {
                exchangeId: 'exchange-2023',
                createdAt: new Date('2023-12-01'),
                isSecretSanta: false,
                participants: [alexId, whitneyId],
                assignments: [
                    {giverId: alexId, recipientId: whitneyId},
                    {giverId: whitneyId, recipientId: alexId},
                ],
                houses: [],
            },
        ]);

        return {alexId, whitneyId, hunterId};
    }

    it('returns 405 for non-GET requests', async () => {
        const event = {httpMethod: 'POST', queryStringParameters: {email: 'a@b.com'}};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('finds exchanges by email', async () => {
        await setupExchanges();

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toHaveLength(2);

        // Should be sorted by createdAt descending (most recent first)
        expect(body[0].exchangeId).toBe('exchange-2024');
        expect(body[1].exchangeId).toBe('exchange-2023');
    });

    it('resolves participant names', async () => {
        await setupExchanges();

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        const body = JSON.parse(response.body);

        // First exchange has 3 participants
        expect(body[0].participantNames).toContain('Alex');
        expect(body[0].participantNames).toContain('Whitney');
        expect(body[0].participantNames).toContain('Hunter');
    });

    it('includes house info with resolved names', async () => {
        await setupExchanges();

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body[0].houses).toHaveLength(1);
        expect(body[0].houses[0].name).toBe('Family');
        expect(body[0].houses[0].members).toContain('Alex');
        expect(body[0].houses[0].members).toContain('Whitney');
    });

    it('returns 404 for email with no exchanges', async () => {
        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'nobody@test.com'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(404);

        const body = JSON.parse(response.body);
        expect(body.error).toBe('No exchanges found');
    });

    it('returns 400 when email is missing', async () => {
        const event = {
            httpMethod: 'GET',
            queryStringParameters: {},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });
});
