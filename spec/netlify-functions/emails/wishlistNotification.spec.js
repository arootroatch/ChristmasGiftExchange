import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {render, getData} from '../../../netlify/shared/emails/wishlistNotification.mjs';
import {setupMongo, teardownMongo, cleanCollections} from '../mongoHelper.js';
import {ObjectId} from 'mongodb';

describe('wishlistNotification', () => {
    describe('render', () => {
        it('renders recipient name in notification message', () => {
            const html = render({recipientName: 'Alex'});
            expect(html).toContain('Alex has added a wishlist');
        });

        it('includes shared layout footer', () => {
            const html = render({recipientName: 'Alex'});
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

        it('returns recipient name', async () => {
            const giverId = new ObjectId();
            const recipientId = new ObjectId();
            const exchangeId = crypto.randomUUID();

            await db.collection('users').insertMany([
                {_id: giverId, name: 'Whitney', email: 'w@test.com', wishlists: [], wishItems: []},
                {_id: recipientId, name: 'Alex', email: 'a@test.com',
                    wishlists: [{url: 'https://amazon.com/list', title: 'My List'}], wishItems: []},
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

            expect(data.recipientName).toBe('Alex');
        });
    });
});
