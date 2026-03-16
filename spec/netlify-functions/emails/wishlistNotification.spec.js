import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {render, getData} from '../../../netlify/shared/emails/wishlistNotification.mjs';
import {setupMongo, teardownMongo, cleanCollections} from '../mongoHelper.js';
import {ObjectId} from 'mongodb';

describe('wishlistNotification', () => {
    describe('render', () => {
        it('renders recipient name in notification message', () => {
            const html = render({recipientName: 'Alex', wishlistViewUrl: 'https://example.com/view'});
            expect(html).toContain('Alex has added a wishlist');
        });

        it('renders view wishlist button with URL', () => {
            const html = render({recipientName: 'Alex', wishlistViewUrl: 'https://example.com/view'});
            expect(html).toContain('View Their Wishlist');
            expect(html).toContain('https://example.com/view');
        });

        it('includes shared layout footer', () => {
            const html = render({recipientName: 'Alex', wishlistViewUrl: 'https://example.com/view'});
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

        it('returns recipient name and wishlist view URL using giver token', async () => {
            const giverId = new ObjectId();
            const recipientId = new ObjectId();
            const giverToken = crypto.randomUUID();
            const exchangeId = crypto.randomUUID();

            await db.collection('users').insertMany([
                {_id: giverId, name: 'Whitney', email: 'w@test.com', token: giverToken, wishlists: [], wishItems: []},
                {_id: recipientId, name: 'Alex', email: 'a@test.com', token: crypto.randomUUID(),
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
            expect(data.wishlistViewUrl).toContain(`/wishlist/view/${giverToken}`);
            expect(data.wishlistViewUrl).toContain(`exchange=${exchangeId}`);
        });
    });
});
