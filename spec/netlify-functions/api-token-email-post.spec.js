import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-token-email-post', () => {
    let handler, mongo, db, mockFetch;

    const userId = new ObjectId();
    const userToken = crypto.randomUUID();

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;

        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-token-email-post.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        mockFetch.mockClear();

        await db.collection('users').insertOne({
            _id: userId,
            name: 'Alex',
            email: 'alex@test.com',
            token: userToken,
            wishlists: [],
            wishItems: [],
        });
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'rateLimits');
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
            body: JSON.stringify(body),
            headers: {},
            path: '/.netlify/functions/api-token-email-post',
        };
    }

    it('returns 405 for non-POST requests', async () => {
        const response = await handler({httpMethod: 'GET', body: '{}', headers: {}, path: '/.netlify/functions/api-token-email-post'});
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 for missing email', async () => {
        const response = await handler(buildEvent({}));
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
        const response = await handler(buildEvent({email: 'not-an-email'}));
        expect(response.statusCode).toBe(400);
    });

    it('returns {sent: true} and sends email for existing user', async () => {
        const response = await handler(buildEvent({email: 'alex@test.com'}));
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.sent).toBe(true);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.To).toBe('alex@test.com');
        expect(callBody.Subject).toBe('Your Gift Exchange Token');
        expect(callBody.HtmlBody).toContain('Alex');
        expect(callBody.HtmlBody).toContain(userToken);
        expect(callBody.HtmlBody).toContain(
            `https://test.netlify.app/wishlist/edit?user=${userToken}`
        );
    });

    it('returns {sent: true} but does NOT send email for non-existent user', async () => {
        const response = await handler(buildEvent({email: 'nobody@test.com'}));
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.sent).toBe(true);

        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not expose token in the response body', async () => {
        const response = await handler(buildEvent({email: 'alex@test.com'}));
        expect(response.body).not.toContain(userToken);
    });
});
