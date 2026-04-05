import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {render, getData} from '../../../netlify/shared/emails/wishlistNotification.mjs';
import {setupMongo, teardownMongo, cleanCollections} from '../../shared/mongoSetup.js';
import {makeUser, makeExchange, seedUsers, seedExchange} from '../../shared/testData.js';

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
            const giver = makeUser({name: 'Whitney', email: 'w@test.com'});
            const recipient = makeUser({
                name: 'Alex', email: 'a@test.com',
                wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
            });

            await seedUsers(db, giver, recipient);
            await seedExchange(db, makeExchange({
                isSecretSanta: true,
                participants: [giver._id, recipient._id],
                assignments: [{giverId: giver._id, recipientId: recipient._id}],
            }));

            const data = await getData(db);

            expect(data.recipientName).toBe('Alex');
        });
    });
});
