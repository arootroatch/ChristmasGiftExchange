import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {MongoClient, ObjectId} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('api-user-wishlist-put', () => {
    let mongoServer;
    let client;
    let handler;
    let originalEnv;
    let consoleLogSpy;
    let consoleErrorSpy;
    let mockFetch;

    beforeAll(async () => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        originalEnv = {...process.env};

        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        process.env.MONGO_DB_URI = uri;
        process.env.MONGODB_DATABASE = 'test-db';
        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret';

        client = new MongoClient(uri);
        await client.connect();

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-user-wishlist-put.mjs');
        handler = module.handler;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterEach(async () => {
        const db = client.db('test-db');
        await db.collection('users').deleteMany({});
        await db.collection('exchanges').deleteMany({});
    });

    afterAll(async () => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        vi.unstubAllGlobals();
        process.env = originalEnv;
        await client.close();
        await mongoServer.stop();
    });

    function buildEvent(token, body) {
        return {
            httpMethod: 'PUT',
            path: `/api/user/${token}/wishlist`,
            body: JSON.stringify(body),
        };
    }

    it('returns 405 for non-PUT requests', async () => {
        const event = {httpMethod: 'GET', path: '/api/user/token/wishlist'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 404 for unknown token', async () => {
        const event = buildEvent('nonexistent-token', {wishlists: [], wishItems: []});
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
    });

    it('updates wishlist data for existing user', async () => {
        const db = client.db('test-db');
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            token: 'wishlist-token',
            wishlists: [],
            wishItems: [],
        });

        const event = buildEvent('wishlist-token', {
            wishlists: [{url: 'https://amazon.com/list', title: 'My Amazon List'}],
            wishItems: [{url: 'https://amazon.com/item', title: 'Cool Gadget'}],
        });

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);

        // Verify data was persisted
        const user = await db.collection('users').findOne({token: 'wishlist-token'});
        expect(user.wishlists).toHaveLength(1);
        expect(user.wishlists[0].url).toBe('https://amazon.com/list');
        expect(user.wishItems).toHaveLength(1);
    });

    it('notifies givers on first wishlist submission', async () => {
        const db = client.db('test-db');
        const recipientId = new ObjectId();
        const giverId = new ObjectId();

        await db.collection('users').insertMany([
            {
                _id: recipientId,
                email: 'recipient@test.com',
                name: 'Whitney',
                token: 'recipient-token',
                wishlists: [],
                wishItems: [],
            },
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: 'giver-token',
                wishlists: [],
                wishItems: [],
            },
        ]);

        await db.collection('exchanges').insertOne({
            exchangeId: 'exchange-1',
            createdAt: new Date(),
            isSecretSanta: true,
            participants: [recipientId, giverId],
            assignments: [
                {giverId: giverId, recipientId: recipientId},
            ],
            houses: [],
        });

        const event = buildEvent('recipient-token', {
            wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
            wishItems: [],
        });

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.notifiedGivers).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Verify notification was sent to giver
        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[0]).toBe('https://test.netlify.app/.netlify/functions/emails/wishlist-notification');
        const emailBody = JSON.parse(fetchCall[1].body);
        expect(emailBody.to).toBe('giver@test.com');
        expect(emailBody.parameters.recipientName).toBe('Whitney');
    });

    it('does not notify givers on subsequent wishlist updates', async () => {
        const db = client.db('test-db');
        const recipientId = new ObjectId();
        const giverId = new ObjectId();

        await db.collection('users').insertMany([
            {
                _id: recipientId,
                email: 'recipient@test.com',
                name: 'Whitney',
                token: 'recipient-token-2',
                wishlists: [{url: 'https://existing.com', title: 'Existing'}],
                wishItems: [],
            },
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: 'giver-token-2',
                wishlists: [],
                wishItems: [],
            },
        ]);

        await db.collection('exchanges').insertOne({
            exchangeId: 'exchange-2',
            createdAt: new Date(),
            isSecretSanta: true,
            participants: [recipientId, giverId],
            assignments: [{giverId: giverId, recipientId: recipientId}],
            houses: [],
        });

        const event = buildEvent('recipient-token-2', {
            wishlists: [
                {url: 'https://existing.com', title: 'Existing'},
                {url: 'https://new.com', title: 'New List'},
            ],
            wishItems: [],
        });

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.notifiedGivers).toBe(false);
        expect(mockFetch).not.toHaveBeenCalled();
    });
});
