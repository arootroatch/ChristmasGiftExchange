import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from '../shared/testData.js';
import {authCookie, buildEvent} from '../shared/specHelper.js';

describe('api-exchange-post contract', () => {
    let handler, db, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';
        process.env.JWT_SECRET = 'test-secret';
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
        delete process.env.JWT_SECRET;
        return teardownMongo(mongo);
    });

    async function insertOrganizer() {
        const organizer = makeUser({name: 'Organizer', email: 'organizer@test.com'});
        await seedUsers(db, organizer);
        return organizer._id;
    }

    // This mirrors the shape returned by getExchangePayload() in src/exchange/state.js:166-174
    const fePayload = {
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
        it('accepts payload shaped like getExchangePayload() with session cookie', async () => {
            const organizerId = await insertOrganizer();
            const cookie = await authCookie(organizerId);
            const event = buildEvent('POST', {body: fePayload, headers: {cookie}});
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('accepts payload without houses (no groups created)', async () => {
            const organizerId = await insertOrganizer();
            const cookie = await authCookie(organizerId);
            const event = buildEvent('POST', {
                body: {...fePayload, houses: []},
                headers: {cookie},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('accepts payload with isSecretSanta false', async () => {
            const organizerId = await insertOrganizer();
            const cookie = await authCookie(organizerId);
            const event = buildEvent('POST', {
                body: {...fePayload, isSecretSanta: false},
                headers: {cookie},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('rejects request without session cookie (401)', async () => {
            const event = buildEvent('POST', {body: fePayload});
            const response = await handler(event);
            expect(response.statusCode).toBe(401);
        });

        it('rejects payload missing participants', async () => {
            const organizerId = await insertOrganizer();
            const cookie = await authCookie(organizerId);
            const {participants, ...incomplete} = fePayload;
            const event = buildEvent('POST', {body: incomplete, headers: {cookie}});
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });

        it('rejects payload missing assignments', async () => {
            const organizerId = await insertOrganizer();
            const cookie = await authCookie(organizerId);
            const {assignments, ...incomplete} = fePayload;
            const event = buildEvent('POST', {body: incomplete, headers: {cookie}});
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });

        it('rejects payload missing exchangeId', async () => {
            const organizerId = await insertOrganizer();
            const cookie = await authCookie(organizerId);
            const {exchangeId, ...incomplete} = fePayload;
            const event = buildEvent('POST', {body: incomplete, headers: {cookie}});
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });

        it('rejects payload with duplicate participant emails', async () => {
            const organizerId = await insertOrganizer();
            const cookie = await authCookie(organizerId);
            const event = buildEvent('POST', {
                body: {
                    ...fePayload,
                    participants: [
                        {name: 'Alice', email: 'same@test.com'},
                        {name: 'Bob', email: 'same@test.com'},
                        {name: 'Carol', email: 'carol@test.com'},
                    ],
                },
                headers: {cookie},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains exchangeId and participants with name and email', async () => {
            const organizerId = await insertOrganizer();
            const cookie = await authCookie(organizerId);
            const event = buildEvent('POST', {body: fePayload, headers: {cookie}});
            const response = await handler(event);
            const body = JSON.parse(response.body);

            // FE uses: body.exchangeId (EmailTable.js:93) and body.participants (EmailTable.js:94)
            expect(body).toHaveProperty('exchangeId');
            expect(body).toHaveProperty('participants');
            expect(body.participants[0]).toHaveProperty('name');
            expect(body.participants[0]).toHaveProperty('email');
        });

        it('does not leak tokens or organizer in response', async () => {
            const organizerId = await insertOrganizer();
            const cookie = await authCookie(organizerId);
            const event = buildEvent('POST', {body: fePayload, headers: {cookie}});
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
            const organizerId = await insertOrganizer();
            const cookie = await authCookie(organizerId);
            const event = buildEvent('POST', {body: fePayload, headers: {cookie}});
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('emailsFailed');
            expect(Array.isArray(body.emailsFailed)).toBe(true);
        });
    });
});
