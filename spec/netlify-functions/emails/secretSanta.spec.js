import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {render, getData} from '../../../netlify/shared/emails/secretSanta.mjs';
import {setupMongo, teardownMongo, cleanCollections} from '../../shared/mongoSetup.js';
import {makeUser, makeExchange, seedUsers, seedExchange} from '../../shared/testData.js';

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

        it('includes dashboard button', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).toContain('gift-exchange-generator.com/dashboard');
            expect(html).toContain('Open Dashboard');
        });

        it('includes recipient name in dashboard CTA', () => {
            const html = render({name: 'Alex', recipient: 'Hunter'});
            expect(html).toContain("View Hunter's wish list");
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
            const giver = makeUser({name: 'Alex', email: 'a@test.com'});
            const recipient = makeUser({name: 'Hunter', email: 'h@test.com'});

            await seedUsers(db, giver, recipient);
            await seedExchange(db, makeExchange({
                isSecretSanta: true,
                participants: [giver._id, recipient._id],
                assignments: [{giverId: giver._id, recipientId: recipient._id}],
            }));

            const data = await getData(db);

            expect(data.name).toBe('Alex');
            expect(data.recipient).toBe('Hunter');
        });
    });
});
