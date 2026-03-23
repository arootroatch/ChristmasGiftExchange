import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-wishlist-email-post', () => {
    let handler, mongo, db, mockFetch;

    const giverId = new ObjectId();
    const recipientId = new ObjectId();
    const exchangeId = crypto.randomUUID();

    async function authCookie(userId) {
        const {signSession} = await import("../../netlify/shared/jwt.mjs");
        return `session=${await signSession(userId.toString())}`;
    }

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;

        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';
        process.env.JWT_SECRET = 'test-secret';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-wishlist-email-post.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        mockFetch.mockClear();

        await db.collection('users').insertMany([
            {_id: giverId, name: 'Alex', email: 'alex@test.com', wishlists: [], wishItems: []},
            {_id: recipientId, name: 'Hunter', email: 'hunter@test.com', wishlists: [], wishItems: []},
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
        await cleanCollections(db, 'users', 'exchanges', 'rateLimits');
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
        delete process.env.CONTEXT;
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    function buildEvent(body, headers = {}) {
        return {
            httpMethod: 'POST',
            body: JSON.stringify(body),
            headers,
            path: '/.netlify/functions/api-wishlist-email-post',
        };
    }

    it('returns 405 for non-POST requests', async () => {
        const response = await handler({httpMethod: 'GET', body: '{}', headers: {}, path: '/.netlify/functions/api-wishlist-email-post'});
        expect(response.statusCode).toBe(405);
    });

    it('returns 401 for missing cookie', async () => {
        const response = await handler(buildEvent({exchangeId}));
        expect(response.statusCode).toBe(401);
    });

    it('returns 400 for missing exchangeId', async () => {
        const response = await handler(buildEvent({}, {cookie: await authCookie(giverId)}));
        expect(response.statusCode).toBe(400);
    });

    it('returns 404 when exchange not found', async () => {
        const response = await handler(buildEvent({exchangeId: 'nonexistent'}, {cookie: await authCookie(giverId)}));
        expect(response.statusCode).toBe(404);
    });

    it('returns 404 when user is not a giver in the exchange', async () => {
        const response = await handler(buildEvent({exchangeId}, {cookie: await authCookie(recipientId)}));
        expect(response.statusCode).toBe(404);
    });

    it('looks up user by cookie and sends wishlist link email', async () => {
        const response = await handler(buildEvent({exchangeId}, {cookie: await authCookie(giverId)}));
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.sent).toBe(true);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.To).toBe('alex@test.com');
        expect(callBody.HtmlBody).toContain('Hunter');
    });

    it('does not expose any tokens in the response', async () => {
        const response = await handler(buildEvent({exchangeId}, {cookie: await authCookie(giverId)}));
        const responseText = response.body;
        expect(responseText).not.toContain('token');
    });
});
