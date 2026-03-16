import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';

describe('api-recipient-get contract', () => {
    let handler, db, mongo, giver, recipient;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-recipient-get.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        giver = makeUser({name: 'Alice', email: 'alice@test.com'});
        recipient = makeUser({
            name: 'Bob',
            email: 'bob@test.com',
            wishlists: [{url: 'https://amazon.com/list', title: 'Bobs List'}],
        });
        await seedUsers(db, giver, recipient);
        await seedExchange(db, makeExchange({
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges'));
    afterAll(() => teardownMongo(mongo));

    function recipientGetEvent(email) {
        return buildEvent('GET', {queryStringParameters: {email}});
    }

    describe('request contract (FE → BE)', () => {
        it('accepts GET with email query parameter', async () => {
            const response = await handler(recipientGetEvent(giver.email));
            expect(response.statusCode).toBe(200);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains recipient, date, and giverName but not wishlistViewUrl', async () => {
            const response = await handler(recipientGetEvent(giver.email));
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('recipient');
            expect(body).toHaveProperty('date');
            expect(body).toHaveProperty('giverName');
            expect(typeof body.recipient).toBe('string');
            expect(typeof body.giverName).toBe('string');
            expect(body).not.toHaveProperty('wishlistViewUrl');
        });
    });
});
