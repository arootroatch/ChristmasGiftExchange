import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';

describe('api-recipient-get contract', () => {
    let handler, db, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-recipient-get.mjs');
        handler = module.handler;
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges'));
    afterAll(() => teardownMongo(mongo));

    async function seedExchangeWithAssignment() {
        const giver = makeUser({name: 'Alice', email: 'alice@test.com'});
        const recipient = makeUser({
            name: 'Bob',
            email: 'bob@test.com',
            wishlists: [{url: 'https://amazon.com/list', title: 'Bobs List'}],
        });
        await seedUsers(db, giver, recipient);
        await seedExchange(db, makeExchange({
            exchangeId: 'recip-ex',
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));
        return {giver, recipient};
    }

    describe('request contract (FE → BE)', () => {
        it('accepts GET with email query parameter', async () => {
            const {giver} = await seedExchangeWithAssignment();

            // Mirrors: src/exchange/components/EmailQuery.js:72
            const event = buildEvent('GET', {
                queryStringParameters: {email: giver.email},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains recipient and date', async () => {
            const {giver} = await seedExchangeWithAssignment();

            const event = buildEvent('GET', {
                queryStringParameters: {email: giver.email},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            // FE destructures: {date, recipient, wishlistViewUrl} in EmailQuery.js onSuccess
            expect(body).toHaveProperty('recipient');
            expect(body).toHaveProperty('date');
            expect(typeof body.recipient).toBe('string');
        });

        it('includes wishlistViewUrl when recipient has wishlist', async () => {
            const {giver} = await seedExchangeWithAssignment();

            const event = buildEvent('GET', {
                queryStringParameters: {email: giver.email},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('wishlistViewUrl');
            expect(typeof body.wishlistViewUrl).toBe('string');
        });

        it('omits wishlistViewUrl when recipient has no wishlist', async () => {
            const giver = makeUser({name: 'Alice', email: 'alice2@test.com'});
            const recipient = makeUser({name: 'Bob', email: 'bob2@test.com'}); // no wishlists
            await seedUsers(db, giver, recipient);
            await seedExchange(db, makeExchange({
                exchangeId: 'recip-ex-2',
                participants: [giver._id, recipient._id],
                assignments: [{giverId: giver._id, recipientId: recipient._id}],
            }));

            const event = buildEvent('GET', {
                queryStringParameters: {email: giver.email},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body).not.toHaveProperty('wishlistViewUrl');
        });
    });
});
