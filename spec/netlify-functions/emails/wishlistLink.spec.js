import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {render, getData} from '../../../netlify/shared/emails/wishlistLink.mjs';
import {setupMongo, teardownMongo, cleanCollections} from '../mongoHelper.js';
import {ObjectId} from 'mongodb';

describe('wishlistLink', () => {
    describe('render', () => {
        it('renders recipient name', () => {
            const html = render({recipientName: 'Hunter'});
            expect(html).toContain("Hunter's");
        });

        it('includes shared layout footer', () => {
            const html = render({recipientName: 'Hunter'});
            expect(html).toContain('Happy gift giving!');
        });
    });

    describe('getData', () => {
        let mongo, db;

        beforeAll(async () => {
            mongo = await setupMongo();
            db = mongo.db;
        });

        afterEach(async () => {
            await cleanCollections(db, 'users', 'exchanges');
        });

        afterAll(async () => {
            await teardownMongo(mongo);
        });

        it('returns recipientName', async () => {
            const giverId = new ObjectId();
            const recipientId = new ObjectId();
            const exchangeId = crypto.randomUUID();

            await db.collection('users').insertMany([
                {_id: giverId, name: 'Alex', email: 'a@test.com', wishlists: [], wishItems: []},
                {_id: recipientId, name: 'Hunter', email: 'h@test.com', wishlists: [], wishItems: []},
            ]);
            await db.collection('exchanges').insertOne({
                exchangeId,
                createdAt: new Date(),
                isSecretSanta: true,
                participants: [giverId, recipientId],
                assignments: [{giverId, recipientId}],
                houses: [],
            });

            const data = await getData(db);

            expect(data.recipientName).toBe('Hunter');
        });
    });
});
