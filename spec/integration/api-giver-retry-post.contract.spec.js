import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';

describe('api-giver-retry-post contract', () => {
    let handler, db, mongo;

    async function authCookie(userId) {
        const {signSession} = await import("../../netlify/shared/jwt.mjs");
        return `session=${await signSession(userId.toString())}`;
    }

    beforeAll(async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
        })));
        process.env.JWT_SECRET = 'test-secret';
        process.env.URL = 'http://localhost:8888';
        process.env.POSTMARK_SERVER_TOKEN = 'test-token';
        process.env.CONTEXT = 'production';
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-giver-retry-post.mjs');
        handler = module.handler;
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges', 'rateLimits'));
    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.JWT_SECRET;
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
        delete process.env.CONTEXT;
        await teardownMongo(mongo);
    });

    async function setupExchange() {
        const organizer = makeUser({name: 'Alice', email: 'alice@test.com'});
        const participant = makeUser({name: 'Bob', email: 'bob@test.com'});
        await seedUsers(db, organizer, participant);
        const exchange = makeExchange({
            organizer: organizer._id,
            participants: [organizer._id, participant._id],
            assignments: [
                {giverId: organizer._id, recipientId: participant._id},
                {giverId: participant._id, recipientId: organizer._id},
            ],
        });
        await seedExchange(db, exchange);
        return {organizer, participant, exchange};
    }

    describe('request contract (FE → BE)', () => {
        it('accepts POST with cookie and exchangeId', async () => {
            const {organizer, exchange} = await setupExchange();
            const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(organizer._id)}});
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('accepts optional participantEmails filter', async () => {
            const {organizer, exchange} = await setupExchange();
            const event = buildEvent('POST', {body: {
                exchangeId: exchange.exchangeId,
                participantEmails: ['alice@test.com'],
            }, headers: {cookie: await authCookie(organizer._id)}});
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('rejects request without cookie', async () => {
            const event = buildEvent('POST', {body: {exchangeId: 'some-id'}});
            const response = await handler(event);
            expect(response.statusCode).toBe(401);
        });

        it('rejects request without exchangeId', async () => {
            const {organizer} = await setupExchange();
            const event = buildEvent('POST', {body: {}, headers: {cookie: await authCookie(organizer._id)}});
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains sent and total numbers', async () => {
            const {organizer, exchange} = await setupExchange();
            const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(organizer._id)}});
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('sent');
            expect(body).toHaveProperty('total');
            expect(typeof body.sent).toBe('number');
            expect(typeof body.total).toBe('number');
        });

        it('response contains sent, total, and emailsFailed', async () => {
            const {organizer, exchange} = await setupExchange();
            const event = buildEvent('POST', {body: {exchangeId: exchange.exchangeId}, headers: {cookie: await authCookie(organizer._id)}});
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('sent');
            expect(body).toHaveProperty('total');
            expect(body).toHaveProperty('emailsFailed');
            expect(typeof body.sent).toBe('number');
            expect(typeof body.total).toBe('number');
            expect(Array.isArray(body.emailsFailed)).toBe(true);
        });
    });
});
