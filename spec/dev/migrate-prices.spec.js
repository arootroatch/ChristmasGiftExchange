import {describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../netlify-functions/mongoHelper.js';
import {makeUser} from '../shared/testFactories.js';

describe('migrate-prices', () => {
    let mongo, db;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it('converts string prices to integers', async () => {
        const user = makeUser({
            name: 'Alex',
            email: 'alex@test.com',
            wishItems: [
                {url: 'https://a.com', title: 'Socks', price: '$15.00'},
                {url: 'https://b.com', title: 'Hat', price: '25.50'},
            ],
        });
        await db.collection('users').insertOne(user);

        const {migratePrices} = await import('../../dev/migrate-prices.mjs');
        const result = await migratePrices(db);

        const updated = await db.collection('users').findOne({_id: user._id});
        expect(updated.wishItems[0].price).toBe(1500);
        expect(updated.wishItems[1].price).toBe(2550);
        expect(updated.currency).toBe('USD');
        expect(result.migrated).toBe(1);
    });

    it('converts empty string price to 0', async () => {
        const user = makeUser({
            name: 'Bob',
            email: 'bob@test.com',
            wishItems: [{url: 'https://a.com', title: 'Thing', price: ''}],
        });
        await db.collection('users').insertOne(user);

        const {migratePrices} = await import('../../dev/migrate-prices.mjs');
        await migratePrices(db);

        const updated = await db.collection('users').findOne({_id: user._id});
        expect(updated.wishItems[0].price).toBe(0);
    });

    it('skips users with no wishItems', async () => {
        const user = makeUser({name: 'Carol', email: 'carol@test.com'});
        await db.collection('users').insertOne(user);

        const {migratePrices} = await import('../../dev/migrate-prices.mjs');
        const result = await migratePrices(db);

        expect(result.migrated).toBe(0);
    });

    it('skips users whose prices are already integers', async () => {
        const user = makeUser({
            name: 'Dave',
            email: 'dave@test.com',
            wishItems: [{url: 'https://a.com', title: 'Thing', price: 2500}],
            currency: 'USD',
        });
        await db.collection('users').insertOne(user);

        const {migratePrices} = await import('../../dev/migrate-prices.mjs');
        const result = await migratePrices(db);

        expect(result.migrated).toBe(0);
    });
});
