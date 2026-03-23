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

        it('includes shared layout footer', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).toContain('Happy gift giving!');
        });

        it('includes retrieval link', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).toContain('gift-exchange-generator.com');
        });

        it('does not display token section', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).not.toContain('Your personal token');
            expect(html).not.toContain('Save this token');
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

        it('returns giver name and recipient name', async () => {
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

            expect(data.name).toBe('Alex');
            expect(data.recipient).toBe('Hunter');
        });
    });
});
