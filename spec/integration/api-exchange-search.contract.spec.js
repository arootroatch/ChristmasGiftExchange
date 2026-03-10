import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';

describe('api-exchange-search contract', () => {
    let handler, db, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-exchange-search.mjs');
        handler = module.handler;
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges'));
    afterAll(() => teardownMongo(mongo));

    async function seedExchangeWithUsers() {
        const alice = makeUser({name: 'Alice', email: 'alice@test.com'});
        const bob = makeUser({name: 'Bob', email: 'bob@test.com'});

        await seedUsers(db, alice, bob);
        await seedExchange(db, makeExchange({
            exchangeId: 'search-ex-1',
            isSecretSanta: true,
            participants: [alice._id, bob._id],
            assignments: [{giverId: alice._id, recipientId: bob._id}, {giverId: bob._id, recipientId: alice._id}],
            houses: [{name: 'Group 1', members: [alice._id, bob._id]}],
        }));

        return {alice, bob};
    }

    describe('request contract (FE → BE)', () => {
        it('accepts GET with email query parameter', async () => {
            const {alice} = await seedExchangeWithUsers();

            // Mirrors: src/reuse.js:12
            const event = buildEvent('GET', {
                queryStringParameters: {email: alice.email},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('returns array with fields FE destructures in reuse.js', async () => {
            const {alice} = await seedExchangeWithUsers();

            const event = buildEvent('GET', {
                queryStringParameters: {email: alice.email},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(Array.isArray(body)).toBe(true);
            expect(body.length).toBeGreaterThan(0);

            const exchange = body[0];
            // All fields FE uses — see spec/reuse.spec.js sampleExchanges
            expect(exchange).toHaveProperty('exchangeId');
            expect(exchange).toHaveProperty('createdAt');
            expect(exchange).toHaveProperty('isSecretSanta');
            expect(exchange).toHaveProperty('participantNames');
            expect(exchange).toHaveProperty('houses');
            expect(exchange).toHaveProperty('participants');
            expect(exchange).toHaveProperty('assignments');
        });

        it('participantNames is array of strings', async () => {
            const {alice} = await seedExchangeWithUsers();

            const event = buildEvent('GET', {
                queryStringParameters: {email: alice.email},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            const exchange = body[0];
            expect(Array.isArray(exchange.participantNames)).toBe(true);
            expect(typeof exchange.participantNames[0]).toBe('string');
        });

        it('houses contain name and members array', async () => {
            const {alice} = await seedExchangeWithUsers();

            const event = buildEvent('GET', {
                queryStringParameters: {email: alice.email},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            const house = body[0].houses[0];
            expect(house).toHaveProperty('name');
            expect(house).toHaveProperty('members');
            expect(Array.isArray(house.members)).toBe(true);
        });

        it('participants contain name and email', async () => {
            const {alice} = await seedExchangeWithUsers();

            const event = buildEvent('GET', {
                queryStringParameters: {email: alice.email},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            const participant = body[0].participants[0];
            expect(participant).toHaveProperty('name');
            expect(participant).toHaveProperty('email');
        });

        it('assignments contain giver and recipient strings', async () => {
            const {alice} = await seedExchangeWithUsers();

            const event = buildEvent('GET', {
                queryStringParameters: {email: alice.email},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            const assignment = body[0].assignments[0];
            expect(assignment).toHaveProperty('giver');
            expect(assignment).toHaveProperty('recipient');
            expect(typeof assignment.giver).toBe('string');
            expect(typeof assignment.recipient).toBe('string');
        });

        it('returns empty array for unknown email', async () => {
            const event = buildEvent('GET', {
                queryStringParameters: {email: 'nobody@test.com'},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body).toEqual([]);
        });
    });
});
