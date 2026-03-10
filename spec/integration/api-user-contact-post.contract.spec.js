import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections, buildEvent, makeUser, makeExchange, seedUsers, seedExchange} from './contractHelper.js';

describe('api-user-contact-post contract', () => {
    let handler, db, mongo, recipient;

    beforeAll(async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ok: true})));
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-user-contact-post.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        const giver = makeUser({name: 'Giver', email: 'giver@test.com'});
        recipient = makeUser({name: 'Recipient', email: 'recipient@test.com'});
        await seedUsers(db, giver, recipient);
        await seedExchange(db, makeExchange({
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));
    });

    afterEach(() => cleanCollections(db, 'users', 'exchanges'));
    afterAll(async () => {
        vi.unstubAllGlobals();
        await teardownMongo(mongo);
    });

    function contactEvent(body) {
        return buildEvent('POST', {
            path: `/.netlify/functions/api-user-contact-post/${recipient.token}`,
            body,
        });
    }

    describe('request contract (FE → BE)', () => {
        it('accepts POST with address, phone, and notes', async () => {
            const response = await handler(contactEvent({
                address: '123 Main St',
                phone: '555-1234',
                notes: 'Ring doorbell',
            }));
            expect(response.statusCode).toBe(200);
        });

        it('accepts partial fields (BE applies defaults)', async () => {
            const response = await handler(contactEvent({address: '123 Main St'}));
            expect(response.statusCode).toBe(200);
        });

        it('accepts empty object (all defaults)', async () => {
            const response = await handler(contactEvent({}));
            expect(response.statusCode).toBe(200);
        });
    });

    describe('response contract (BE → FE)', () => {
        it('response contains success boolean', async () => {
            const response = await handler(contactEvent({address: '123 Main St'}));
            const body = JSON.parse(response.body);

            expect(body).toHaveProperty('success');
            expect(body.success).toBe(true);
        });
    });
});
