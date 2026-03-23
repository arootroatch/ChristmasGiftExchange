import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';
import {makeUser, makeExchange, buildEvent} from '../shared/testFactories.js';

describe('api-giver-retry-post', () => {
    let db, handler, mongo, mockFetch;

    async function authCookie(userId) {
        const {signSession} = await import("../../netlify/shared/jwt.mjs");
        return `session=${await signSession(userId.toString())}`;
    }

    let organizer, otherUser, participantA, participantB;
    let exchange;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);

        process.env.JWT_SECRET = 'test-secret';
        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';

        mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-giver-retry-post.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        mockFetch.mockClear();

        organizer = makeUser({name: 'Alex', email: 'alex@test.com'});
        otherUser = makeUser({name: 'Stranger', email: 'stranger@test.com'});
        participantA = makeUser({name: 'Whitney', email: 'whitney@test.com'});
        participantB = makeUser({name: 'Hunter', email: 'hunter@test.com'});

        await db.collection('users').insertMany([organizer, otherUser, participantA, participantB]);

        exchange = makeExchange({
            organizer: organizer._id,
            participants: [organizer._id, participantA._id, participantB._id],
            assignments: [
                {giverId: organizer._id, recipientId: participantA._id},
                {giverId: participantA._id, recipientId: participantB._id},
                {giverId: participantB._id, recipientId: organizer._id},
            ],
        });
        await db.collection('exchanges').insertOne(exchange);
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges', 'rateLimits');
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.JWT_SECRET;
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
        delete process.env.CONTEXT;
        await teardownMongo(mongo);
    });

    function mockBatchResponse(emails, failedEmails = []) {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(
                emails.map(e => ({
                    ErrorCode: failedEmails.includes(e) ? 406 : 0,
                    To: e,
                }))
            ),
        });
    }

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

    it('returns 401 for invalid cookie', async () => {
        const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: 'session=invalid'}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('returns 403 when authenticated user is not the organizer', async () => {
        const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(otherUser._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(403);
    });

    it('returns 404 for non-existent exchange', async () => {
        const event = buildEvent('POST', {body: {exchangeId: 'non-existent'}, headers: {cookie: await authCookie(organizer._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
    });

    it('sends batch emails to all participants using DB data', async () => {
        mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);
        const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(organizer._id)}});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0][0]).toBe('https://api.postmarkapp.com/email/batch');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body).toHaveLength(3);

        const alexMsg = body.find(m => m.To === 'alex@test.com');
        expect(alexMsg.HtmlBody).toContain('Whitney');
    });

    it('filters to subset when participantEmails provided', async () => {
        mockBatchResponse(['alex@test.com']);
        const event = buildEvent('POST', {body: {
            exchangeId: exchange.exchangeId,
            participantEmails: ['alex@test.com'],
        }, headers: {cookie: await authCookie(organizer._id)}});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body).toHaveLength(1);
        expect(body[0].To).toBe('alex@test.com');
    });

    it('rejects participantEmails that do not exist in the exchange', async () => {
        const event = buildEvent('POST', {body: {
            exchangeId: exchange.exchangeId,
            participantEmails: ['nobody@test.com'],
        }, headers: {cookie: await authCookie(organizer._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);

        const responseBody = JSON.parse(response.body);
        expect(responseBody.error).toContain('nobody@test.com');
    });

    it('returns sent, total, and emailsFailed', async () => {
        mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);
        const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(organizer._id)}});
        const response = await handler(event);
        const responseBody = JSON.parse(response.body);

        expect(responseBody.sent).toBe(3);
        expect(responseBody.total).toBe(3);
        expect(responseBody.emailsFailed).toEqual([]);
    });

    it('counts partial failures and sends error-alert', async () => {
        mockBatchResponse(
            ['alex@test.com', 'whitney@test.com', 'hunter@test.com'],
            ['whitney@test.com']
        );
        mockFetch.mockResolvedValueOnce({ok: true}); // error-alert

        const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(organizer._id)}});
        const response = await handler(event);
        const responseBody = JSON.parse(response.body);

        expect(responseBody.sent).toBe(2);
        expect(responseBody.total).toBe(3);
        expect(responseBody.emailsFailed).toEqual(['whitney@test.com']);

        expect(mockFetch).toHaveBeenCalledTimes(2);
        const errorAlertBody = JSON.parse(mockFetch.mock.calls[1][1].body);
        expect(errorAlertBody.HtmlBody).toContain('api-giver-retry-post');
        expect(errorAlertBody.HtmlBody).toContain('whitney@test.com');
    });

    it('sends email without token-based URLs', async () => {
        mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);
        const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(organizer._id)}});
        await handler(event);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        const alexMsg = body.find(m => m.To === 'alex@test.com');
        expect(alexMsg.HtmlBody).not.toContain('wishlist/edit?user=');
    });
});
