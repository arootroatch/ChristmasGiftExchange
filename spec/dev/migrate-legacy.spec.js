import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../netlify-functions/mongoHelper.js';

describe('migrateLegacyData', () => {
    let db, migrateLegacyData;
    let mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        const module = await import('../../dev/migrate-legacy.mjs');
        migrateLegacyData = module.migrateLegacyData;
    });

    afterEach(async () => {
        await cleanCollections(db, 'names', 'users', 'exchanges');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it('creates users and exchange from legacy documents', async () => {
        await db.collection('names').insertMany([
            {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
            {name: 'Whitney', email: 'whitney@test.com', recipient: 'Hunter', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
            {name: 'Hunter', email: 'hunter@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        ]);

        const result = await migrateLegacyData(db, 'names');

        expect(result.usersCreated).toBe(3);
        expect(result.exchangesCreated).toBe(1);

        const users = await db.collection('users').find().toArray();
        expect(users).toHaveLength(3);
        expect(users.every(u => Array.isArray(u.wishlists))).toBe(true);
        expect(users.every(u => Array.isArray(u.wishItems))).toBe(true);

        const exchanges = await db.collection('exchanges').find().toArray();
        expect(exchanges).toHaveLength(1);
        expect(exchanges[0].exchangeId).toBe('ex-2024');
        expect(exchanges[0].isSecretSanta).toBe(true);
        expect(exchanges[0].houses).toEqual([]);
        expect(exchanges[0].participants).toHaveLength(3);
        expect(exchanges[0].assignments).toHaveLength(3);

        const userMap = {};
        users.forEach(u => { userMap[u.name] = u._id; });

        const alexToWhitney = exchanges[0].assignments.find(
            a => a.giverId.equals(userMap['Alex'])
        );
        expect(alexToWhitney.recipientId.equals(userMap['Whitney'])).toBe(true);
    });

    it('handles multiple exchanges across different dates', async () => {
        await db.collection('names').insertMany([
            {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
            {name: 'Whitney', email: 'whitney@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
            {name: 'Alex', email: 'alex@test.com', recipient: 'Hunter', date: '2023-12-01T00:00:00Z', id: 'ex-2023'},
            {name: 'Hunter', email: 'hunter@test.com', recipient: 'Alex', date: '2023-12-01T00:00:00Z', id: 'ex-2023'},
        ]);

        const result = await migrateLegacyData(db, 'names');

        expect(result.usersCreated).toBe(3);
        expect(result.exchangesCreated).toBe(2);

        const exchanges = await db.collection('exchanges').find().sort({createdAt: -1}).toArray();
        expect(exchanges).toHaveLength(2);
        expect(exchanges[0].exchangeId).toBe('ex-2024');
        expect(exchanges[0].participants).toHaveLength(2);
        expect(exchanges[1].exchangeId).toBe('ex-2023');
        expect(exchanges[1].participants).toHaveLength(2);
    });

    it('is idempotent — running twice does not create duplicates', async () => {
        await db.collection('names').insertMany([
            {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
            {name: 'Whitney', email: 'whitney@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        ]);

        await migrateLegacyData(db, 'names');
        const result = await migrateLegacyData(db, 'names');

        expect(result.usersSkipped).toBe(2);
        expect(result.exchangesSkipped).toBe(1);
        expect(result.usersCreated).toBe(0);
        expect(result.exchangesCreated).toBe(0);

        const users = await db.collection('users').find().toArray();
        expect(users).toHaveLength(2);

        const exchanges = await db.collection('exchanges').find().toArray();
        expect(exchanges).toHaveLength(1);
    });

    it('preserves existing user wishlists', async () => {
        await db.collection('users').insertOne({
            name: 'Alex',
            email: 'alex@test.com',
            wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
            wishItems: [{url: 'https://amazon.com/item', title: 'Cool Thing', price: '$25'}],
        });

        await db.collection('names').insertMany([
            {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
            {name: 'Whitney', email: 'whitney@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        ]);

        await migrateLegacyData(db, 'names');

        const alex = await db.collection('users').findOne({email: 'alex@test.com'});
        expect(alex.wishlists).toHaveLength(1);
        expect(alex.wishItems).toHaveLength(1);
    });

    it('dry run reports counts without writing data', async () => {
        await db.collection('names').insertMany([
            {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
            {name: 'Whitney', email: 'whitney@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        ]);

        const result = await migrateLegacyData(db, 'names', {dryRun: true});

        expect(result.usersCreated).toBe(2);
        expect(result.exchangesCreated).toBe(1);
        expect(result.dryRun).toBe(true);

        const users = await db.collection('users').find().toArray();
        expect(users).toHaveLength(0);

        const exchanges = await db.collection('exchanges').find().toArray();
        expect(exchanges).toHaveLength(0);
    });
});
