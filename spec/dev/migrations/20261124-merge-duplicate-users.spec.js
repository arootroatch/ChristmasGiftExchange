import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../../shared/mongoSetup.js';
import {makeUser, makeExchange, makeLinkExchange, seedUsers, seedExchange, seedLinkExchange} from '../../shared/testData.js';

describe('20261124-merge-duplicate-users', () => {
    let db, mongo, up, down;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        ({up, down} = await import('../../../dev/migrations/20261124-merge-duplicate-users.mjs'));
        // Matches production (netlify/shared/schemas/user.mjs)
        await db.collection('users').createIndex({email: 1}, {unique: true});
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges', 'linkExchanges', 'userMergeBackup');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    const users = () => db.collection('users').find().toArray();

    it('up: merges users whose emails differ only by case, keeping the one in the latest exchange', async () => {
        const old = makeUser({name: 'Ignas 2024', email: 'Ignas.Veryga@test.com'});
        const current = makeUser({name: 'Ignas', email: 'ignas.veryga@test.com'});
        await seedUsers(db, old, current);
        await seedExchange(db, makeExchange({createdAt: new Date('2024-12-01'), participants: [old._id]}));
        await seedExchange(db, makeExchange({createdAt: new Date('2025-12-01'), participants: [current._id]}));

        await up(db);

        const remaining = await users();
        expect(remaining).toHaveLength(1);
        expect(remaining[0]._id).toEqual(current._id);
        expect(remaining[0].email).toBe('ignas.veryga@test.com');
        expect(remaining[0].name).toBe('Ignas');
    });

    it('up and down: work under the unique email index when the kept user has the uppercase email', async () => {
        const current = makeUser({email: 'Dup@test.com'});
        const old = makeUser({email: 'dup@test.com'});
        await seedUsers(db, current, old);
        await seedExchange(db, makeExchange({createdAt: new Date('2025-12-01'), participants: [current._id]}));

        await up(db);
        const [merged] = await users();
        expect(merged._id).toEqual(current._id);
        expect(merged.email).toBe('dup@test.com');

        await down(db);
        const emails = (await users()).map(u => u.email).sort();
        expect(emails).toEqual(['Dup@test.com', 'dup@test.com']);
    });

    it('up: repoints exchange participants, assignments, houses, organizer and link exchange organizer', async () => {
        const old = makeUser({email: 'Dup@test.com'});
        const current = makeUser({email: 'dup@test.com'});
        const other = makeUser({email: 'other@test.com'});
        await seedUsers(db, old, current, other);
        await seedExchange(db, makeExchange({createdAt: new Date('2025-12-01'), participants: [current._id]}));
        await seedExchange(db, makeExchange({
            exchangeId: 'old-exchange',
            organizer: old._id,
            createdAt: new Date('2024-12-01'),
            participants: [old._id, other._id],
            assignments: [{giverId: old._id, recipientId: other._id}, {giverId: other._id, recipientId: old._id}],
            houses: [{name: 'Family', members: [old._id, other._id]}],
        }));
        await seedLinkExchange(db, makeLinkExchange({exchangeId: 'link', organizer: old._id}));

        await up(db);

        const exchange = await db.collection('exchanges').findOne({exchangeId: 'old-exchange'});
        expect(exchange.organizer).toEqual(current._id);
        expect(exchange.participants).toEqual([current._id, other._id]);
        expect(exchange.assignments).toEqual([
            {giverId: current._id, recipientId: other._id},
            {giverId: other._id, recipientId: current._id},
        ]);
        expect(exchange.houses[0].members).toEqual([current._id, other._id]);
        const link = await db.collection('linkExchanges').findOne({exchangeId: 'link'});
        expect(link.organizer).toEqual(current._id);
    });

    it('up: merges wishlists and wish items, de-duplicated by url, and keeps a currency', async () => {
        const old = makeUser({
            email: 'Dup@test.com', currency: 'EUR',
            wishlists: [{url: 'https://a.com', title: 'A'}, {url: 'https://shared.com', title: 'Old'}],
            wishItems: [{url: 'https://item.com', title: 'Item', price: 500}],
        });
        const current = makeUser({
            email: 'dup@test.com',
            wishlists: [{url: 'https://shared.com', title: 'Current'}],
        });
        await seedUsers(db, old, current);
        await seedExchange(db, makeExchange({createdAt: new Date('2025-12-01'), participants: [current._id]}));

        await up(db);

        const [merged] = await users();
        expect(merged.wishlists).toEqual([
            {url: 'https://shared.com', title: 'Current'},
            {url: 'https://a.com', title: 'A'},
        ]);
        expect(merged.wishItems).toEqual([{url: 'https://item.com', title: 'Item', price: 500}]);
        expect(merged.currency).toBe('EUR');
    });

    it('up: lowercases and trims emails of users without duplicates', async () => {
        const solo = makeUser({email: ' Solo@Test.com '});
        const fine = makeUser({email: 'fine@test.com'});
        await seedUsers(db, solo, fine);

        await up(db);

        const byId = Object.fromEntries((await users()).map(u => [u._id.toString(), u.email]));
        expect(byId).toEqual({[solo._id.toString()]: 'solo@test.com', [fine._id.toString()]: 'fine@test.com'});
    });

    it('down: restores users, exchanges and link exchanges to their pre-migration state', async () => {
        const old = makeUser({email: 'Dup@test.com', wishlists: [{url: 'https://a.com', title: 'A'}]});
        const current = makeUser({email: 'dup@test.com'});
        const solo = makeUser({email: 'Solo@test.com'});
        await seedUsers(db, old, current, solo);
        await seedExchange(db, makeExchange({createdAt: new Date('2025-12-01'), participants: [current._id, solo._id]}));
        await seedExchange(db, makeExchange({
            organizer: old._id, createdAt: new Date('2024-12-01'), participants: [old._id, solo._id],
            assignments: [{giverId: old._id, recipientId: solo._id}],
        }));
        await seedLinkExchange(db, makeLinkExchange({organizer: old._id}));
        const snapshot = async () => {
            const all = async name => (await db.collection(name).find().toArray())
                .sort((a, b) => a._id.toString().localeCompare(b._id.toString()));
            return {users: await all('users'), exchanges: await all('exchanges'), linkExchanges: await all('linkExchanges')};
        };
        const before = await snapshot();

        await up(db);
        await down(db);

        expect(await snapshot()).toEqual(before);
        expect(await db.collection('userMergeBackup').countDocuments()).toBe(0);
    });
});
