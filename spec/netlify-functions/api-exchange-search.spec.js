import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-exchange-search', () => {
    let client, db, handler;
    let mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const module = await import('../../netlify/functions/api-exchange-search.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    async function setupExchanges() {
        const alexId = new ObjectId();
        const whitneyId = new ObjectId();
        const hunterId = new ObjectId();

        await db.collection('users').insertMany([
            {_id: alexId, email: 'alex@test.com', name: 'Alex', token: 'alex-token', wishlists: [], wishItems: []},
            {_id: whitneyId, email: 'whitney@test.com', name: 'Whitney', token: 'whitney-token', wishlists: [], wishItems: []},
            {_id: hunterId, email: 'hunter@test.com', name: 'Hunter', token: 'hunter-token', wishlists: [], wishItems: []},
        ]);

        await db.collection('exchanges').insertMany([
            {
                exchangeId: 'exchange-2024',
                createdAt: new Date('2024-12-01'),
                isSecretSanta: true,
                participants: [alexId, whitneyId, hunterId],
                assignments: [
                    {giverId: alexId, recipientId: whitneyId},
                    {giverId: whitneyId, recipientId: hunterId},
                    {giverId: hunterId, recipientId: alexId},
                ],
                houses: [{name: 'Family', members: [alexId, whitneyId]}],
            },
            {
                exchangeId: 'exchange-2023',
                createdAt: new Date('2023-12-01'),
                isSecretSanta: false,
                participants: [alexId, whitneyId],
                assignments: [
                    {giverId: alexId, recipientId: whitneyId},
                    {giverId: whitneyId, recipientId: alexId},
                ],
                houses: [],
            },
        ]);

        return {alexId, whitneyId, hunterId};
    }

    it('returns 405 for non-GET requests', async () => {
        const event = {httpMethod: 'POST', queryStringParameters: {email: 'a@b.com'}};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('finds exchanges by email', async () => {
        await setupExchanges();

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toHaveLength(2);

        // Should be sorted by createdAt descending (most recent first)
        expect(body[0].exchangeId).toBe('exchange-2024');
        expect(body[1].exchangeId).toBe('exchange-2023');
    });

    it('resolves participant names', async () => {
        await setupExchanges();

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        const body = JSON.parse(response.body);

        // First exchange has 3 participants
        expect(body[0].participantNames).toContain('Alex');
        expect(body[0].participantNames).toContain('Whitney');
        expect(body[0].participantNames).toContain('Hunter');
    });

    it('includes house info with resolved names', async () => {
        await setupExchanges();

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body[0].houses).toHaveLength(1);
        expect(body[0].houses[0].name).toBe('Family');
        expect(body[0].houses[0].members).toContain('Alex');
        expect(body[0].houses[0].members).toContain('Whitney');
    });

    it('returns 200 with empty array for email with no exchanges', async () => {
        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'nobody@test.com'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toEqual([]);
    });

    it('returns 400 when email is missing', async () => {
        const event = {
            httpMethod: 'GET',
            queryStringParameters: {},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });
});
