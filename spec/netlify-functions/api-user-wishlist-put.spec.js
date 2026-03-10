import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-user-wishlist-put', () => {
    let client, db, handler;
    let mongo;
    let mockFetch;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);

        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret';
        process.env.CONTEXT = 'production';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-user-wishlist-put.mjs');
        handler = module.handler;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges');
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.URL;
        delete process.env.NETLIFY_EMAILS_SECRET;
        delete process.env.CONTEXT;
        await teardownMongo(mongo);
    });

    function buildEvent(token, body) {
        return {
            httpMethod: 'PUT',
            path: `/.netlify/functions/api-user-wishlist-put/${token}`,
            body: JSON.stringify(body),
        };
    }

    it('returns 405 for non-PUT requests', async () => {
        const event = {httpMethod: 'GET', path: '/.netlify/functions/api-user-wishlist-put/token'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 401 for unknown token', async () => {
        const event = buildEvent('nonexistent-token', {wishlists: [], wishItems: []});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('updates wishlist data for existing user', async () => {

        const alexToken = crypto.randomUUID();
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            token: alexToken,
            wishlists: [],
            wishItems: [],
        });

        const event = buildEvent(alexToken, {
            wishlists: [{url: 'https://amazon.com/list', title: 'My Amazon List'}],
            wishItems: [{url: 'https://amazon.com/item', title: 'Cool Gadget'}],
        });

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);

        // Verify data was persisted
        const user = await db.collection('users').findOne({token: alexToken});
        expect(user.wishlists).toHaveLength(1);
        expect(user.wishlists[0].url).toBe('https://amazon.com/list');
        expect(user.wishItems).toHaveLength(1);
    });

    it('notifies givers on first wishlist submission', async () => {

        const recipientId = new ObjectId();
        const giverId = new ObjectId();
        const recipientToken = crypto.randomUUID();
        const giverToken = crypto.randomUUID();

        await db.collection('users').insertMany([
            {
                _id: recipientId,
                email: 'recipient@test.com',
                name: 'Whitney',
                token: recipientToken,
                wishlists: [],
                wishItems: [],
            },
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: giverToken,
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

        const event = buildEvent(recipientToken, {
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

    it('returns 400 for invalid body', async () => {

        const alexToken = crypto.randomUUID();
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            token: alexToken,
            wishlists: [],
            wishItems: [],
        });

        const event = {
            httpMethod: 'PUT',
            path: `/.netlify/functions/api-user-wishlist-put/${alexToken}`,
            body: JSON.stringify({wishlists: "not-an-array"}),
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toBeDefined();
    });

    it('does not notify givers on subsequent wishlist updates', async () => {

        const recipientId = new ObjectId();
        const giverId = new ObjectId();
        const recipientToken = crypto.randomUUID();
        const giverToken = crypto.randomUUID();

        await db.collection('users').insertMany([
            {
                _id: recipientId,
                email: 'recipient@test.com',
                name: 'Whitney',
                token: recipientToken,
                wishlists: [{url: 'https://existing.com', title: 'Existing'}],
                wishItems: [],
            },
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: giverToken,
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

        const event = buildEvent(recipientToken, {
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
