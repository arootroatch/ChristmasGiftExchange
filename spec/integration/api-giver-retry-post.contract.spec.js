import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, seedUsers} from './contractHelper.js';

describe('api-giver-retry-post contract', () => {
    let handler, db, mongo;

    beforeAll(async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
        })));
        process.env.URL = 'http://localhost:8888';
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-giver-retry-post.mjs');
        handler = module.handler;
    });

    afterEach(() => cleanCollections(db, 'users'));
    afterAll(async () => {
        vi.unstubAllGlobals();
        await teardownMongo(mongo);
    });

    // Mirrors the shape FE sends from EmailTable.js retryFailedEmails
    const fePayload = {
        exchangeId: '00000000-0000-0000-0000-000000000001',
        participants: [
            {name: 'Alice', email: 'alice@test.com'},
            {name: 'Bob', email: 'bob@test.com'},
        ],
        assignments: [
            {giver: 'Alice', recipient: 'Bob'},
            {giver: 'Bob', recipient: 'Alice'},
        ],
    };

    describe('request contract (FE → BE)', () => {
        it('accepts POST with participants and assignments arrays', async () => {
            // Seed users so the handler can look them up
            const alice = makeUser({name: 'Alice', email: 'alice@test.com'});
            const bob = makeUser({name: 'Bob', email: 'bob@test.com'});
            await seedUsers(db, alice, bob);

            const event = buildEvent('POST', {body: fePayload});
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('rejects participants without email', async () => {
            const event = buildEvent('POST', {
                body: {
                    participants: [{name: 'Alice'}],
                    assignments: [{giver: 'Alice', recipient: 'Bob'}],
                },
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });

        it('rejects assignments without recipient', async () => {
            const event = buildEvent('POST', {
                body: {
                    participants: [{name: 'Alice', email: 'alice@test.com'}],
                    assignments: [{giver: 'Alice'}],
                },
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(400);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains sent and total numbers', async () => {
            const alice = makeUser({name: 'Alice', email: 'alice@test.com'});
            const bob = makeUser({name: 'Bob', email: 'bob@test.com'});
            await seedUsers(db, alice, bob);

            const event = buildEvent('POST', {body: fePayload});
            const response = await handler(event);
            const body = JSON.parse(response.body);

            // FE uses: body.sent, body.total, and body.emailsFailed in EmailTable.js retry handler
            expect(body).toHaveProperty('sent');
            expect(body).toHaveProperty('total');
            expect(typeof body.sent).toBe('number');
            expect(typeof body.total).toBe('number');
        });

        it('response contains sent, total, and emailsFailed', async () => {
            const alice = makeUser({name: 'Alice', email: 'alice@test.com'});
            const bob = makeUser({name: 'Bob', email: 'bob@test.com'});
            await seedUsers(db, alice, bob);

            const event = buildEvent('POST', {body: fePayload});
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
