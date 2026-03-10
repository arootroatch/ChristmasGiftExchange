import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';

describe('api-user-contact-post contract', () => {
    let handler, db, mongo;

    beforeAll(async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ok: true})));
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-user-contact-post.mjs');
        handler = module.handler;
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges'));
    afterAll(async () => {
        vi.unstubAllGlobals();
        await teardownMongo(mongo);
    });

    async function seedUserWithGiver() {
        const giver = makeUser({name: 'Giver', email: 'giver@test.com'});
        const recipient = makeUser({name: 'Recipient', email: 'recipient@test.com'});
        await seedUsers(db, giver, recipient);
        await seedExchange(db, makeExchange({
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));
        return {giver, recipient};
    }

    describe('request contract (FE → BE)', () => {
        it('accepts POST with address, phone, and notes', async () => {
            const {recipient} = await seedUserWithGiver();

            // Mirrors: src/wishlistEdit/components/ContactForm.js:40-44
            const event = buildEvent('POST', {
                path: `/.netlify/functions/api-user-contact-post/${recipient.token}`,
                body: {
                    address: '123 Main St',
                    phone: '555-1234',
                    notes: 'Ring doorbell',
                },
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('accepts partial fields (BE applies defaults)', async () => {
            const {recipient} = await seedUserWithGiver();

            const event = buildEvent('POST', {
                path: `/.netlify/functions/api-user-contact-post/${recipient.token}`,
                body: {address: '123 Main St'},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });

        it('accepts empty object (all defaults)', async () => {
            const {recipient} = await seedUserWithGiver();

            const event = buildEvent('POST', {
                path: `/.netlify/functions/api-user-contact-post/${recipient.token}`,
                body: {},
            });
            const response = await handler(event);
            expect(response.statusCode).toBe(200);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains success boolean', async () => {
            const {recipient} = await seedUserWithGiver();

            const event = buildEvent('POST', {
                path: `/.netlify/functions/api-user-contact-post/${recipient.token}`,
                body: {address: '123 Main St'},
            });
            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('success');
            expect(body.success).toBe(true);
        });
    });
});
