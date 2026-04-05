import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from '../shared/testData.js';
import {buildEvent} from '../shared/specHelper.js';

describe('api-auth-code-post', () => {
    let db, handler, mongo, mockFetch;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);

        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';
        process.env.JWT_SECRET = 'test-secret';

        mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-auth-code-post.mjs');
        handler = module.handler;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'authCodes', 'rateLimits');
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
        delete process.env.CONTEXT;
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    it('returns 405 for non-POST requests', async () => {
        const event = buildEvent('GET');
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 for missing email', async () => {
        const event = buildEvent('POST', {body: {}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
        const event = buildEvent('POST', {body: {email: 'not-an-email'}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns {sent: true} for existing user and sends verification email', async () => {
        const user = makeUser({email: 'exists@test.com'});
        await seedUsers(db, user);

        const event = buildEvent('POST', {body: {email: 'exists@test.com'}});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.sent).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('returns {sent: true} for non-existent email but does NOT send email', async () => {
        const event = buildEvent('POST', {body: {email: 'nobody@test.com'}});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.sent).toBe(true);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('stores a code in authCodes collection when user exists', async () => {
        const user = makeUser({email: 'exists@test.com'});
        await seedUsers(db, user);

        const event = buildEvent('POST', {body: {email: 'exists@test.com'}});
        await handler(event);

        const codes = await db.collection('authCodes').find({email: 'exists@test.com'}).toArray();
        expect(codes).toHaveLength(1);
        expect(codes[0].codeHash).toBeDefined();
        expect(codes[0].expiresAt).toBeDefined();
        expect(codes[0].createdAt).toBeDefined();
    });
});
