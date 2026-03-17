import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {render, getData} from '../../../netlify/shared/emails/wishlistLink.mjs';
import {setupMongo, teardownMongo, cleanCollections} from '../mongoHelper.js';
import {ObjectId} from 'mongodb';

describe('wishlistLink', () => {
    describe('render', () => {
        it('renders recipient name', () => {
            const html = render({recipientName: 'Hunter', wishlistViewUrl: 'https://example.com/view'});
            expect(html).toContain("Hunter's");
        });

        it('renders view wishlist button with URL', () => {
            const html = render({recipientName: 'Hunter', wishlistViewUrl: 'https://example.com/view'});
            expect(html).toContain('https://example.com/view');
            expect(html).toContain("View Hunter's Wish List");
        });

        it('includes shared layout footer', () => {
            const html = render({recipientName: 'Hunter', wishlistViewUrl: 'https://example.com/view'});
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

        it('returns recipientName and wishlistViewUrl', async () => {
            const giverId = new ObjectId();
            const recipientId = new ObjectId();
            const giverToken = crypto.randomUUID();
            const exchangeId = crypto.randomUUID();

            await db.collection('users').insertMany([
                {_id: giverId, name: 'Alex', email: 'a@test.com', token: giverToken, wishlists: [], wishItems: []},
                {_id: recipientId, name: 'Hunter', email: 'h@test.com', token: crypto.randomUUID(), wishlists: [], wishItems: []},
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
            expect(data.wishlistViewUrl).toContain(`/wishlist/view?user=${giverToken}`);
            expect(data.wishlistViewUrl).toContain(`exchange=${exchangeId}`);
        });
    });
});
