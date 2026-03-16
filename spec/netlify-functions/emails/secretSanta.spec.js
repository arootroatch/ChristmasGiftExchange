import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {render, getData} from '../../../netlify/shared/emails/secretSanta.mjs';
import {setupMongo, teardownMongo, cleanCollections} from '../mongoHelper.js';
import {ObjectId} from 'mongodb';

describe('secretSanta', () => {
    describe('render', () => {
        it('renders greeting with name', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).toContain('Greetings, Alex!');
        });

        it('renders recipient name in green', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).toContain('Hunter!');
            expect(html).toContain('rgb(1, 195, 1)');
        });

        it('includes wishlist CTA when wishlistEditUrl provided', () => {
            const html = render({
                name: 'Alex',
                recipient: 'Hunter',
                wishlistEditUrl: 'https://example.com/wishlist/edit/abc',
            });
            expect(html).toContain('Add Your Wishlist');
            expect(html).toContain('https://example.com/wishlist/edit/abc');
        });

        it('omits wishlist CTA when wishlistEditUrl is null', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).not.toContain('Add Your Wishlist');
        });

        it('includes shared layout footer', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).toContain('Happy gift giving!');
        });

        it('includes retrieval link', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).toContain('giftexchangegenerator.netlify.app');
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

        it('returns giver name, recipient name, and wishlistEditUrl', async () => {
            const giverId = new ObjectId();
            const recipientId = new ObjectId();
            const giverToken = crypto.randomUUID();

            await db.collection('users').insertMany([
                {_id: giverId, name: 'Alex', email: 'a@test.com', token: giverToken, wishlists: [], wishItems: []},
                {_id: recipientId, name: 'Hunter', email: 'h@test.com', token: crypto.randomUUID(), wishlists: [], wishItems: []},
            ]);
            await db.collection('exchanges').insertOne({
                exchangeId: crypto.randomUUID(),
                createdAt: new Date(),
                isSecretSanta: true,
                participants: [giverId, recipientId],
                assignments: [{giverId, recipientId}],
                houses: [],
            });

            const data = await getData(db);

            expect(data.name).toBe('Alex');
            expect(data.recipient).toBe('Hunter');
            expect(data.wishlistEditUrl).toContain(`/wishlist/edit/${giverToken}`);
        });
    });
});
