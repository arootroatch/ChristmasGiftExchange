import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';

describe('api-exchange-get contract', () => {
    let handler, db, mongo, alice, bob;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-exchange-get.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        alice = makeUser({name: 'Alice', email: 'alice@test.com'});
        bob = makeUser({name: 'Bob', email: 'bob@test.com'});
        await seedUsers(db, alice, bob);
        await seedExchange(db, makeExchange({
            exchangeId: crypto.randomUUID(),
            isSecretSanta: true,
            participants: [alice._id, bob._id],
            assignments: [{giverId: alice._id, recipientId: bob._id}, {giverId: bob._id, recipientId: alice._id}],
            houses: [{name: 'Group 1', members: [alice._id, bob._id]}],
        }));
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges'));
    afterAll(() => teardownMongo(mongo));

    function searchEvent(email) {
        return buildEvent('GET', {queryStringParameters: {email}});
    }

    async function searchAlice() {
        const response = await handler(searchEvent(alice.email));
        return JSON.parse(response.body);
    }

    describe('request contract (FE → BE)', () => {
        it('accepts GET with email query parameter', async () => {
            const response = await handler(searchEvent(alice.email));
            expect(response.statusCode).toBe(200);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('returns array with fields FE destructures in reuse.js', async () => {
            const body = await searchAlice();

            expect(Array.isArray(body)).toBe(true);
            expect(body.length).toBeGreaterThan(0);

            const exchange = body[0];
            expect(exchange).toHaveProperty('exchangeId');
            expect(exchange).toHaveProperty('createdAt');
            expect(exchange).toHaveProperty('isSecretSanta');
            expect(exchange).toHaveProperty('participantNames');
            expect(exchange).toHaveProperty('houses');
            expect(exchange).toHaveProperty('participants');
            expect(exchange).toHaveProperty('assignments');
        });

        it('participantNames is array of strings', async () => {
            const body = await searchAlice();
            expect(Array.isArray(body[0].participantNames)).toBe(true);
            expect(typeof body[0].participantNames[0]).toBe('string');
        });

        it('houses contain name and members array', async () => {
            const house = (await searchAlice())[0].houses[0];
            expect(house).toHaveProperty('name');
            expect(house).toHaveProperty('members');
            expect(Array.isArray(house.members)).toBe(true);
        });

        it('participants contain name and email', async () => {
            const participant = (await searchAlice())[0].participants[0];
            expect(participant).toHaveProperty('name');
            expect(participant).toHaveProperty('email');
        });

        it('assignments contain giver and recipient strings', async () => {
            const assignment = (await searchAlice())[0].assignments[0];
            expect(assignment).toHaveProperty('giver');
            expect(assignment).toHaveProperty('recipient');
            expect(typeof assignment.giver).toBe('string');
            expect(typeof assignment.recipient).toBe('string');
        });

        it('returns empty array for unknown email', async () => {
            const response = await handler(searchEvent('nobody@test.com'));
            expect(JSON.parse(response.body)).toEqual([]);
        });
    });
});
