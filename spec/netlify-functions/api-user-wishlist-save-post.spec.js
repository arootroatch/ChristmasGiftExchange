import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-user-wishlist-save-post', () => {
    let client, db, handler;
    let mongo;
    let mockFetch;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);

        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-user-wishlist-save-post.mjs');
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
        delete process.env.POSTMARK_SERVER_TOKEN;
        delete process.env.CONTEXT;
        await teardownMongo(mongo);
    });

    function buildEvent(body) {
        return {
            httpMethod: 'POST',
            path: '/.netlify/functions/api-user-wishlist-save-post',
            body: JSON.stringify(body),
        };
    }

    it('returns 405 for non-POST requests', async () => {
        const event = {httpMethod: 'PUT', path: '/.netlify/functions/api-user-wishlist-save-post'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 for missing token', async () => {
        const event = buildEvent({wishlists: [], wishItems: []});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 401 for invalid token', async () => {
        const event = buildEvent({token: crypto.randomUUID(), wishlists: [], wishItems: []});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('saves wishlists and wishItems to user doc', async () => {
        const alexToken = crypto.randomUUID();
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            token: alexToken,
            wishlists: [],
            wishItems: [],
        });

        const event = buildEvent({
            token: alexToken,
            wishlists: [{url: 'https://amazon.com/list', title: 'My Amazon List'}],
            wishItems: [{url: 'https://amazon.com/item', title: 'Cool Gadget', price: '$30'}],
        });

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);

        const user = await db.collection('users').findOne({token: alexToken});
        expect(user.wishlists).toHaveLength(1);
        expect(user.wishlists[0].url).toBe('https://amazon.com/list');
        expect(user.wishItems).toHaveLength(1);
        expect(user.wishItems[0].title).toBe('Cool Gadget');
    });

    it('returns notifiedGivers false when wishlists were already populated', async () => {
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

        const event = buildEvent({
            token: recipientToken,
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

    it('notifies givers when first wishlist added', async () => {
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
            assignments: [{giverId: giverId, recipientId: recipientId}],
            houses: [],
        });

        const event = buildEvent({
            token: recipientToken,
            wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
            wishItems: [],
        });

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.notifiedGivers).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[0]).toBe('https://api.postmarkapp.com/email');
        const emailBody = JSON.parse(fetchCall[1].body);
        expect(emailBody.To).toBe('giver@test.com');
        expect(emailBody.HtmlBody).toContain('Whitney');
    });
});
