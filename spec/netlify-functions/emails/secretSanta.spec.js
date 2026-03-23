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
            expect(html).toContain('#198c0a');
        });

        it('includes wishlist CTA when wishlistEditUrl provided', () => {
            const html = render({
                name: 'Alex',
                recipient: 'Hunter',
                wishlistEditUrl: 'https://example.com/wishlist/edit?user=abc',
            });
            expect(html).toContain('Add Your Wishlist');
            expect(html).toContain('https://example.com/wishlist/edit?user=abc');
        });

        it('omits wishlist CTA when wishlistEditUrl is null', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).not.toContain('Add Your Wishlist');
        });

        it('includes wishlist view CTA with URL and recipient name', () => {
            const html = render({
                name: 'Alex',
                recipient: 'Hunter',
                wishlistViewUrl: 'https://example.com/wishlist/view?user=abc&exchange=123',
            });
            expect(html).toContain("View Hunter's Wish List");
            expect(html).toContain('https://example.com/wishlist/view?user=abc&amp;exchange=123');
        });

        it('omits wishlist view CTA when wishlistViewUrl is null', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).not.toContain("Wish List");
        });

        it('includes shared layout footer', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).toContain('Happy gift giving!');
        });

        it('includes retrieval link', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).toContain('giftexchangegenerator.netlify.app');
        });

        it('displays token in a monospace box when token is provided', () => {
            const html = render({name: 'Alex', recipient: 'Hunter', token: 'abc-123-token'});
            expect(html).toContain('abc-123-token');
            expect(html).toContain('font-family: monospace');
        });

        it('includes save token message when token is provided', () => {
            const html = render({name: 'Alex', recipient: 'Hunter', token: 'abc-123-token'});
            expect(html).toContain('Save this token');
        });

        it('does not display token section when token is null', () => {
            const html = render({name: 'Alex', recipient: 'Hunter', token: null});
            expect(html).not.toContain('Your personal token');
            expect(html).not.toContain('Save this token');
        });

        it('does not display token section when token is omitted', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).not.toContain('Your personal token');
            expect(html).not.toContain('Save this token');
        });

        it('includes token recovery message in closing paragraph when token is provided', () => {
            const html = render({name: 'Alex', recipient: 'Hunter', token: 'abc-123-token'});
            expect(html).toContain('request a new token');
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

        it('returns giver name, recipient name, wishlistEditUrl, and wishlistViewUrl', async () => {
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

            expect(data.name).toBe('Alex');
            expect(data.recipient).toBe('Hunter');
            expect(data.wishlistEditUrl).toContain(`/wishlist/edit?user=${giverToken}`);
            expect(data.wishlistViewUrl).toContain(`/wishlist/view?user=${giverToken}`);
            expect(data.wishlistViewUrl).toContain(`exchange=${exchangeId}`);
        });
    });
});
