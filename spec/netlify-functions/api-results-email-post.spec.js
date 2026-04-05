import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, makeExchange, alex, whitney, hunter, seedUsers, seedExchange} from '../shared/testData.js';
import {authCookie, buildEvent} from '../shared/specHelper.js';

describe('api-results-email-post', () => {
    let db, handler, mongo, mockFetch;

    let otherUser;
    let exchange;

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

        const module = await import('../../netlify/functions/api-results-email-post.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        mockFetch.mockClear();

        otherUser = makeUser({name: 'Stranger', email: 'stranger@test.com'});

        await seedUsers(db, alex, otherUser, whitney, hunter);

        exchange = makeExchange({
            organizer: alex._id,
            assignments: [
                {giverId: alex._id, recipientId: whitney._id},
                {giverId: whitney._id, recipientId: hunter._id},
                {giverId: hunter._id, recipientId: alex._id},
            ],
        });
        await seedExchange(db, exchange);
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

    it('returns 405 for non-POST requests', async () => {
        const event = buildEvent('GET');
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 401 for missing cookie', async () => {
        const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('returns 400 when neither exchangeId nor assignments is provided', async () => {
        const event = buildEvent('POST', {body: {}, headers: {cookie: await authCookie(alex._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 404 for non-existent exchangeId', async () => {
        const event = buildEvent('POST', {body: {exchangeId: 'non-existent'}, headers: {cookie: await authCookie(alex._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
    });

    it('returns 403 when authenticated user is not the organizer', async () => {
        const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(otherUser._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(403);
    });

    it('sends results email to organizer using server-side data', async () => {
        mockFetch.mockResolvedValueOnce({ok: true, json: () => Promise.resolve([])});
        const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(alex._id)}});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        expect(body.To).toBe('alex@test.com');
        expect(body.HtmlBody).toContain('Alex');
        expect(body.HtmlBody).toContain('Whitney');
        expect(body.HtmlBody).toContain('Hunter');
    });

    it('sends results email using client-sent assignments', async () => {
        mockFetch.mockResolvedValueOnce({ok: true, json: () => Promise.resolve([])});
        const assignments = [
            {giver: 'Alex', recipient: 'Whitney'},
            {giver: 'Whitney', recipient: 'Hunter'},
            {giver: 'Hunter', recipient: 'Alex'},
        ];
        const event = buildEvent('POST', {
            body: {assignments},
            headers: {cookie: await authCookie(alex._id)},
        });
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const fetchCall = mockFetch.mock.calls[0];
        const body = JSON.parse(fetchCall[1].body);
        expect(body.To).toBe('alex@test.com');
        expect(body.HtmlBody).toContain('Alex');
        expect(body.HtmlBody).toContain('Whitney');
        expect(body.HtmlBody).toContain('Hunter');
    });

    it('returns 400 when assignments array exceeds 50 items', async () => {
        const assignments = Array.from({length: 51}, (_, i) => ({giver: `Giver${i}`, recipient: `Recipient${i}`}));
        const event = buildEvent('POST', {
            body: {assignments},
            headers: {cookie: await authCookie(alex._id)},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 when assignments array is empty', async () => {
        const event = buildEvent('POST', {
            body: {assignments: []},
            headers: {cookie: await authCookie(alex._id)},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 when assignment has empty giver or recipient', async () => {
        const event = buildEvent('POST', {
            body: {assignments: [{giver: '', recipient: 'Alex'}]},
            headers: {cookie: await authCookie(alex._id)},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns success response body', async () => {
        mockFetch.mockResolvedValueOnce({ok: true, json: () => Promise.resolve([])});
        const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(alex._id)}});
        const response = await handler(event);

        const responseBody = JSON.parse(response.body);
        expect(responseBody.success).toBe(true);
    });
});
