import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent} from './contractHelper.js';

describe('api-exchange-post contract', () => {
    let handler, db, mongo;
    const organizerToken = crypto.randomUUID();

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        }));
        const module = await import('../../netlify/functions/api-exchange-post.mjs');
        handler = module.handler;
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges'));
    afterAll(() => {
        vi.unstubAllGlobals();
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
        delete process.env.CONTEXT;
        return teardownMongo(mongo);
    });

    async function insertOrganizer(token = organizerToken) {
        await db.collection('users').insertOne({
            name: 'Organizer',
            email: 'organizer@test.com',
            token,
            wishlists: [],
            wishItems: [],
        });
    }

    // This mirrors the shape returned by getExchangePayload() in src/exchange/state.js:166-174
    // plus the token field required for authentication
    const fePayload = {
        token: organizerToken,
        exchangeId: crypto.randomUUID(),
        isSecretSanta: true,
        houses: [{id: 'house-1', name: 'Family', members: ['Alice', 'Bob']}],
        participants: [
            {name: 'Alice', email: 'alice@test.com'},
            {name: 'Bob', email: 'bob@test.com'},
            {name: 'Carol', email: 'carol@test.com'},
        ],
        assignments: [
            {giver: 'Alice', recipient: 'Bob'},
            {giver: 'Bob', recipient: 'Carol'},
            {giver: 'Carol', recipient: 'Alice'},
        ],
    };

    describe('request contract (FE → BE)', () => {
        it('accepts payload shaped like getExchangePayload() with token', async () => {
            await insertOrganizer();
            const event = buildEvent('POST', {body: fePayload});
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('accepts payload without houses (no groups created)', async () => {
            await insertOrganizer();
            const event = buildEvent('POST', {
                body: {...fePayload, houses: []},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('accepts payload with isSecretSanta false', async () => {
            await insertOrganizer();
            const event = buildEvent('POST', {
                body: {...fePayload, isSecretSanta: false},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('rejects payload missing token', async () => {
            const {token, ...noToken} = fePayload;
            const event = buildEvent('POST', {body: noToken});
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });

        it('rejects payload missing participants', async () => {
            const {participants, ...incomplete} = fePayload;
            const event = buildEvent('POST', {body: incomplete});
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });

        it('rejects payload missing assignments', async () => {
            const {assignments, ...incomplete} = fePayload;
            const event = buildEvent('POST', {body: incomplete});
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });

        it('rejects payload missing exchangeId', async () => {
            const {exchangeId, ...incomplete} = fePayload;
            const event = buildEvent('POST', {body: incomplete});
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });

        it('rejects payload with duplicate participant emails', async () => {
            await insertOrganizer();
            const event = buildEvent('POST', {
                body: {
                    ...fePayload,
                    participants: [
                        {name: 'Alice', email: 'same@test.com'},
                        {name: 'Bob', email: 'same@test.com'},
                        {name: 'Carol', email: 'carol@test.com'},
                    ],
                },
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains exchangeId and participants with name and email', async () => {
            await insertOrganizer();
            const event = buildEvent('POST', {body: fePayload});
            const response = await handler(event);
            const body = JSON.parse(response.body);

            // FE uses: body.exchangeId (EmailTable.js:93) and body.participants (EmailTable.js:94)
            expect(body).toHaveProperty('exchangeId');
            expect(body).toHaveProperty('participants');
            expect(body.participants[0]).toHaveProperty('name');
            expect(body.participants[0]).toHaveProperty('email');
        });

        it('does not leak tokens or organizer in response', async () => {
            await insertOrganizer();
            const event = buildEvent('POST', {body: fePayload});
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body).not.toHaveProperty('organizer');
            expect(body).not.toHaveProperty('token');
            body.participants.forEach(p => {
                expect(p).not.toHaveProperty('token');
                expect(p).not.toHaveProperty('_id');
            });
        });

        it('response contains emailsFailed array', async () => {
            await insertOrganizer();
            const event = buildEvent('POST', {body: fePayload});
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('emailsFailed');
            expect(Array.isArray(body.emailsFailed)).toBe(true);
        });
    });
});
