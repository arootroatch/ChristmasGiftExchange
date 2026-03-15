import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-recipient-get', () => {
    let client, db, handler;
    let mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const module = await import('../../netlify/functions/api-recipient-get.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges', 'legacy-names');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it('returns 405 for non-GET requests', async () => {
        const event = {httpMethod: 'POST', queryStringParameters: {email: 'a@b.com'}};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 when email is missing', async () => {
        const event = {httpMethod: 'GET', queryStringParameters: {}};
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('queries new collections and returns recipient with wishlist URL', async () => {
        const giverId = new ObjectId();
        const recipientId = new ObjectId();
        const giverToken = crypto.randomUUID();
        const recipientToken = crypto.randomUUID();

        await db.collection('users').insertMany([
            {
                _id: giverId,
                email: 'alex@test.com',
                name: 'Alex',
                token: giverToken,
                wishlists: [],
                wishItems: [],
            },
            {
                _id: recipientId,
                email: 'whitney@test.com',
                name: 'Whitney',
                token: recipientToken,
                wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                wishItems: [],
            },
        ]);

        await db.collection('exchanges').insertOne({
            exchangeId: 'exchange-new',
            createdAt: new Date('2025-12-01'),
            isSecretSanta: true,
            participants: [giverId, recipientId],
            assignments: [
                {giverId: giverId, recipientId: recipientId},
                {giverId: recipientId, recipientId: giverId},
            ],
            houses: [],
        });

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.recipient).toBe('Whitney');
        expect(body.date).toBeDefined();
        expect(body.wishlistViewUrl).toBe(`/wishlist/view/${giverToken}?exchange=exchange-new`);
        expect(body.giverName).toBe('Alex');
    });

    it('does not include wishlist URL when recipient has no wishlist', async () => {
        const giverId = new ObjectId();
        const recipientId = new ObjectId();
        const giverToken = crypto.randomUUID();
        const recipientToken = crypto.randomUUID();

        await db.collection('users').insertMany([
            {
                _id: giverId,
                email: 'alex@test.com',
                name: 'Alex',
                token: giverToken,
                wishlists: [],
                wishItems: [],
            },
            {
                _id: recipientId,
                email: 'whitney@test.com',
                name: 'Whitney',
                token: recipientToken,
                wishlists: [],
                wishItems: [],
            },
        ]);

        await db.collection('exchanges').insertOne({
            exchangeId: 'exchange-no-wishlist',
            createdAt: new Date('2025-12-01'),
            isSecretSanta: true,
            participants: [giverId, recipientId],
            assignments: [{giverId: giverId, recipientId: recipientId}],
            houses: [],
        });

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.recipient).toBe('Whitney');
        expect(body.wishlistViewUrl).toBeUndefined();
        expect(body.giverName).toBe('Alex');
    });

    it('falls back to legacy collection when not in new collections', async () => {
        await db.collection('names').insertOne({
            email: 'old@test.com',
            recipient: 'Legacy Recipient',
            date: new Date('2023-12-01'),
        });

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'old@test.com'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.recipient).toBe('Legacy Recipient');
        expect(body.date).toBeDefined();
        expect(body.wishlistViewUrl).toBeUndefined();
        expect(body.giverName).toBeUndefined();
    });

    it('returns 404 when not found in any collection', async () => {
        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'nobody@test.com'},
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(404);

        const body = JSON.parse(response.body);
        expect(body.error).toBe('Email not found');
    });

    it('returns most recent exchange from new collections', async () => {
        const giverId = new ObjectId();
        const recipientId1 = new ObjectId();
        const recipientId2 = new ObjectId();
        const giverToken = crypto.randomUUID();
        const recipient1Token = crypto.randomUUID();
        const recipient2Token = crypto.randomUUID();

        await db.collection('users').insertMany([
            {_id: giverId, email: 'alex@test.com', name: 'Alex', token: giverToken, wishlists: [], wishItems: []},
            {_id: recipientId1, email: 'old@test.com', name: 'Old Recipient', token: recipient1Token, wishlists: [], wishItems: []},
            {_id: recipientId2, email: 'new@test.com', name: 'New Recipient', token: recipient2Token, wishlists: [], wishItems: []},
        ]);

        await db.collection('exchanges').insertMany([
            {
                exchangeId: 'old-exchange',
                createdAt: new Date('2023-12-01'),
                isSecretSanta: true,
                participants: [giverId, recipientId1],
                assignments: [{giverId: giverId, recipientId: recipientId1}],
                houses: [],
            },
            {
                exchangeId: 'new-exchange',
                createdAt: new Date('2025-12-01'),
                isSecretSanta: true,
                participants: [giverId, recipientId2],
                assignments: [{giverId: giverId, recipientId: recipientId2}],
                houses: [],
            },
        ]);

        const event = {
            httpMethod: 'GET',
            queryStringParameters: {email: 'alex@test.com'},
        };

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.recipient).toBe('New Recipient');
    });
});
