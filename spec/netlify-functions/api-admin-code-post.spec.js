import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {buildEvent} from '../shared/specHelper.js';

vi.mock("../../netlify/shared/logger.mjs");

describe('api-admin-code-post', () => {
    let db, handler, mongo, mockFetch;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);

        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';
        process.env.JWT_SECRET = 'test-secret';
        process.env.ADMIN_EMAIL = 'admin@example.com';

        mockFetch = vi.fn().mockResolvedValue({ok: true, json: () => Promise.resolve([])});
        vi.stubGlobal('fetch', mockFetch);

        const mod = await import('../../netlify/functions/api-admin-code-post.mjs');
        handler = mod.handler;
    });

    beforeEach(() => mockFetch.mockClear());

    afterEach(async () => {
        await cleanCollections(db, 'authCodes', 'rateLimits', 'logs');
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
        delete process.env.CONTEXT;
        delete process.env.JWT_SECRET;
        delete process.env.ADMIN_EMAIL;
        await teardownMongo(mongo);
    });

    it('returns 405 for non-POST requests', async () => {
        const response = await handler(buildEvent('GET'));
        expect(response.statusCode).toBe(405);
    });

    it('returns 200 and sends code to ADMIN_EMAIL', async () => {
        const response = await handler(buildEvent('POST'));
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).sent).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('stores a code in authCodes for ADMIN_EMAIL', async () => {
        await handler(buildEvent('POST'));
        const codes = await db.collection('authCodes').find({email: 'admin@example.com'}).toArray();
        expect(codes).toHaveLength(1);
        expect(codes[0].codeHash).toBeDefined();
        expect(codes[0].expiresAt).toBeDefined();
    });

    it('returns 429 when rate limit exceeded', async () => {
        for (let i = 0; i < 3; i++) await handler(buildEvent('POST'));
        const response = await handler(buildEvent('POST'));
        expect(response.statusCode).toBe(429);
    });
});
