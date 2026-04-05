import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {render, getData} from '../../../netlify/shared/emails/resultsSummary.mjs';
import {setupMongo, teardownMongo, cleanCollections} from '../../shared/mongoSetup.js';
import {makeUser, makeExchange, seedUsers, seedExchange} from '../../shared/testData.js';

describe('resultsSummary', () => {
    describe('render', () => {
        const assignments = [
            {giver: 'Alex', recipient: 'Hunter'},
            {giver: 'Hunter', recipient: 'Alex'},
        ];

        it('renders greeting with organizer name', () => {
            const html = render({name: 'Alex', assignments});
            expect(html).toContain('Hi Alex,');
            expect(html).toContain('Gift Exchange results:');
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
            const alex = makeUser({name: 'Alex', email: 'a@test.com'});
            const hunter = makeUser({name: 'Hunter', email: 'h@test.com'});

            await seedUsers(db, alex, hunter);
            await seedExchange(db, makeExchange({
                isSecretSanta: false,
                participants: [alex._id, hunter._id],
                assignments: [
                    {giverId: alex._id, recipientId: hunter._id},
                    {giverId: hunter._id, recipientId: alex._id},
                ],
            }));

            const data = await getData(db);

            expect(data.name).toBe('Alex');
            expect(data.assignments).toEqual([
                {giver: 'Alex', recipient: 'Hunter'},
                {giver: 'Hunter', recipient: 'Alex'},
            ]);
        });
    });
});
