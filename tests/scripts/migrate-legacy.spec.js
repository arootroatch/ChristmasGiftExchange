import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('migrateLegacyData', () => {
    let mongoServer;
    let client;
    let db;
    let migrateLegacyData;

    beforeAll(async () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        mongoServer = await MongoMemoryServer.create();
        client = new MongoClient(mongoServer.getUri());
        await client.connect();
        db = client.db('test-db');

        const module = await import('../../scripts/migrate-legacy.mjs');
        migrateLegacyData = module.migrateLegacyData;
    });

    afterEach(async () => {
        await db.collection('names').deleteMany({});
        await db.collection('users').deleteMany({});
        await db.collection('exchanges').deleteMany({});
    });

    afterAll(async () => {
        vi.restoreAllMocks();
        await client.close();
        await mongoServer.stop();
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
        expect(users.every(u => u.token)).toBe(true);
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

    it('preserves existing user wishlists and tokens', async () => {
        await db.collection('users').insertOne({
            name: 'Alex',
            email: 'alex@test.com',
            token: 'existing-token-123',
            wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
            wishItems: [{url: 'https://amazon.com/item', title: 'Cool Thing'}],
        });

        await db.collection('names').insertMany([
            {name: 'Alex', email: 'alex@test.com', recipient: 'Whitney', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
            {name: 'Whitney', email: 'whitney@test.com', recipient: 'Alex', date: '2024-12-01T00:00:00Z', id: 'ex-2024'},
        ]);

        await migrateLegacyData(db, 'names');

        const alex = await db.collection('users').findOne({email: 'alex@test.com'});
        expect(alex.token).toBe('existing-token-123');
        expect(alex.wishlists).toHaveLength(1);
        expect(alex.wishItems).toHaveLength(1);
    });
});
