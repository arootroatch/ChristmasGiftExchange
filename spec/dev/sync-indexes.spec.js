import {describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {syncCollection} from '../../dev/sync-indexes.mjs';

describe('syncCollection', () => {
    let db, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
    });

    afterEach(async () => {
        await db.collection('testCol').drop().catch(() => {});
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it('creates indexes on a collection that does not exist yet', async () => {
        const desiredIndexes = [{key: {email: 1}, options: {name: 'email_1', unique: true}}];

        await syncCollection(db, 'testCol', desiredIndexes);

        const indexes = await db.collection('testCol').indexes();
        const names = indexes.map(i => i.name);
        expect(names).toContain('email_1');
    });

    it('creates indexes on an existing collection', async () => {
        await db.collection('testCol').insertOne({email: 'test@test.com'});
        const desiredIndexes = [{key: {email: 1}, options: {name: 'email_1'}}];

        await syncCollection(db, 'testCol', desiredIndexes);

        const indexes = await db.collection('testCol').indexes();
        expect(indexes.map(i => i.name)).toContain('email_1');
    });

    it('drops indexes not in desired list', async () => {
        await db.collection('testCol').insertOne({email: 'test@test.com'});
        await db.collection('testCol').createIndex({email: 1}, {name: 'email_1'});

        await syncCollection(db, 'testCol', []);

        const indexes = await db.collection('testCol').indexes();
        expect(indexes.map(i => i.name)).not.toContain('email_1');
    });
});
