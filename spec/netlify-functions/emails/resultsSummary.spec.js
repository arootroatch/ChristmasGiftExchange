import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {render, getData} from '../../../netlify/shared/emails/resultsSummary.mjs';
import {setupMongo, teardownMongo, cleanCollections} from '../mongoHelper.js';
import {ObjectId} from 'mongodb';

describe('resultsSummary', () => {
    describe('render', () => {
        const assignments = [
            {giver: 'Alex', recipient: 'Hunter'},
            {giver: 'Hunter', recipient: 'Alex'},
        ];

        it('renders greeting with organizer name', () => {
            const html = render({name: 'Alex', assignments});
            expect(html).toContain('Hi Alex, here are your gift exchange results:');
        });

        it('renders assignment table with giver and recipient columns', () => {
            const html = render({name: 'Alex', assignments});
            expect(html).toContain('Giver');
            expect(html).toContain('Recipient');
            expect(html).toContain('Alex');
            expect(html).toContain('Hunter');
        });

        it('renders arrow between giver and recipient', () => {
            const html = render({name: 'Alex', assignments});
            expect(html).toContain('&#8594;');
        });

        it('includes warning to save the email', () => {
            const html = render({name: 'Alex', assignments});
            expect(html).toContain('only copy of your results');
        });

        it('includes shared layout footer', () => {
            const html = render({name: 'Alex', assignments});
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

        it('returns organizer name and resolved assignments', async () => {
            const alexId = new ObjectId();
            const hunterId = new ObjectId();

            await db.collection('users').insertMany([
                {_id: alexId, name: 'Alex', email: 'a@test.com', token: crypto.randomUUID(), wishlists: [], wishItems: []},
                {_id: hunterId, name: 'Hunter', email: 'h@test.com', token: crypto.randomUUID(), wishlists: [], wishItems: []},
            ]);
            await db.collection('exchanges').insertOne({
                exchangeId: crypto.randomUUID(),
                createdAt: new Date(),
                isSecretSanta: false,
                participants: [alexId, hunterId],
                assignments: [
                    {giverId: alexId, recipientId: hunterId},
                    {giverId: hunterId, recipientId: alexId},
                ],
                houses: [],
            });

            const data = await getData(db);

            expect(data.name).toBe('Alex');
            expect(data.assignments).toEqual([
                {giver: 'Alex', recipient: 'Hunter'},
                {giver: 'Hunter', recipient: 'Alex'},
            ]);
        });
    });
});
