import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-wishlist-email-post', () => {
    let handler, mongo, db, mockFetch;

    const giverId = new ObjectId();
    const recipientId = new ObjectId();
    const giverToken = crypto.randomUUID();
    const exchangeId = crypto.randomUUID();

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;

        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret';
        process.env.CONTEXT = 'production';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-wishlist-email-post.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        mockFetch.mockClear();

        await db.collection('users').insertMany([
            {_id: giverId, name: 'Alex', email: 'alex@test.com', token: giverToken, wishlists: [], wishItems: []},
            {_id: recipientId, name: 'Hunter', email: 'hunter@test.com', token: 'recipient-token', wishlists: [], wishItems: []},
        ]);
        await db.collection('exchanges').insertOne({
            exchangeId,
            createdAt: new Date(),
            isSecretSanta: true,
            participants: [giverId, recipientId],
            assignments: [{giverId, recipientId}],
            houses: [],
        });
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

    function buildEvent(body) {
        return {httpMethod: 'POST', body: JSON.stringify(body)};
    }

    it('returns 405 for non-POST requests', async () => {
        const response = await handler({httpMethod: 'GET', body: '{}'});
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 for missing email', async () => {
        const response = await handler(buildEvent({exchangeId}));
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for missing exchangeId', async () => {
        const response = await handler(buildEvent({email: 'alex@test.com'}));
        expect(response.statusCode).toBe(400);
    });

    it('returns 404 when user not found', async () => {
        const response = await handler(buildEvent({email: 'nobody@test.com', exchangeId}));
        expect(response.statusCode).toBe(404);
    });

    it('returns 404 when exchange not found', async () => {
        const response = await handler(buildEvent({email: 'alex@test.com', exchangeId: 'nonexistent'}));
        expect(response.statusCode).toBe(404);
    });

    it('returns 404 when user is not a giver in the exchange', async () => {
        const response = await handler(buildEvent({email: 'hunter@test.com', exchangeId}));
        expect(response.statusCode).toBe(404);
    });

    it('sends wishlist link email and returns 200', async () => {
        const response = await handler(buildEvent({email: 'alex@test.com', exchangeId}));
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.sent).toBe(true);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.to).toBe('alex@test.com');
        expect(callBody.parameters.recipientName).toBe('Hunter');
        expect(callBody.parameters.wishlistViewUrl).toBe(
            `https://test.netlify.app/wishlist/view/${giverToken}?exchange=${exchangeId}`
        );
    });

    it('does not expose any tokens in the response', async () => {
        const response = await handler(buildEvent({email: 'alex@test.com', exchangeId}));
        const responseText = response.body;
        expect(responseText).not.toContain(giverToken);
        expect(responseText).not.toContain('recipient-token');
    });
});
