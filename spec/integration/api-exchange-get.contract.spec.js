import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';

describe('api-exchange-get contract', () => {
    let handler, db, mongo, giver, recipient;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-exchange-get.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        giver = makeUser({name: 'Alice', email: 'alice@test.com'});
        recipient = makeUser({
            name: 'Bob',
            email: 'bob@test.com',
            wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
            wishItems: [{url: 'https://amazon.com/item', title: 'Cool Thing'}],
        });
        await seedUsers(db, giver, recipient);
        await seedExchange(db, makeExchange({
            exchangeId: 'ex-123',
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges'));
    afterAll(() => teardownMongo(mongo));

    function exchangeGetEvent() {
        return buildEvent('GET', {
            path: '/.netlify/functions/api-exchange-get/ex-123',
            queryStringParameters: {token: giver.token},
        });
    }

    describe('request contract (FE → BE)', () => {
        it('accepts GET with exchangeId in path and token in query', async () => {
            const response = await handler(exchangeGetEvent());
            expect(response.statusCode).toBe(200);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains recipientName, wishlists, and wishItems', async () => {
            const response = await handler(exchangeGetEvent());
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('recipientName');
            expect(body).toHaveProperty('wishlists');
            expect(body).toHaveProperty('wishItems');
            expect(typeof body.recipientName).toBe('string');
            expect(Array.isArray(body.wishlists)).toBe(true);
            expect(Array.isArray(body.wishItems)).toBe(true);
        });

        it('wishlists contain url and title', async () => {
            const response = await handler(exchangeGetEvent());
            const body = JSON.parse(response.body);

            expect(body.wishlists[0]).toHaveProperty('url');
            expect(body.wishlists[0]).toHaveProperty('title');
        });

        it('wishItems contain url and title', async () => {
            const response = await handler(exchangeGetEvent());
            const body = JSON.parse(response.body);

            expect(body.wishItems[0]).toHaveProperty('url');
            expect(body.wishItems[0]).toHaveProperty('title');
        });
    });
});
