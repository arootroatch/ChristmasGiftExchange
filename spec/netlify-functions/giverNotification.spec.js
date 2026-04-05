import {describe, expect, it, vi, beforeAll, afterAll, afterEach} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {ObjectId} from 'mongodb';
import {makeUser, makeExchange, seedUsers, seedExchange} from '../shared/testData.js';

describe('forEachGiverOf', () => {
    let forEachGiverOf, mongo, db;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/shared/giverNotification.mjs');
        forEachGiverOf = module.forEachGiverOf;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it('calls callback with giver from most recent exchange only', async () => {
        const recipient = makeUser({name: 'Bob', email: 'bob@test.com'});
        const oldGiver = makeUser({name: 'OldAlice', email: 'old@test.com'});
        const newGiver = makeUser({name: 'NewAlice', email: 'new@test.com'});

        await seedUsers(db, recipient, oldGiver, newGiver);

        const oldExchange = makeExchange({
            exchangeId: 'old-exchange',
            createdAt: new Date('2025-01-01'),
            isSecretSanta: true,
            participants: [oldGiver._id, recipient._id],
            assignments: [{giverId: oldGiver._id, recipientId: recipient._id}],
        });
        const newExchange = makeExchange({
            exchangeId: 'new-exchange',
            createdAt: new Date('2026-01-01'),
            isSecretSanta: true,
            participants: [newGiver._id, recipient._id],
            assignments: [{giverId: newGiver._id, recipientId: recipient._id}],
        });
        await seedExchange(db, oldExchange);
        await seedExchange(db, newExchange);

        const calls = [];
        await forEachGiverOf({_id: recipient._id}, ({giver, exchange}) => {
            calls.push({giverName: giver.name, exchangeId: exchange.exchangeId});
        });

        expect(calls).toHaveLength(1);
        expect(calls[0].giverName).toBe('NewAlice');
        expect(calls[0].exchangeId).toBe('new-exchange');
    });

    it('does nothing when user has no exchanges', async () => {
        const recipient = makeUser({name: 'Nobody', email: 'nobody@test.com'});
        const calls = [];
        await forEachGiverOf({_id: recipient._id}, ({giver}) => {
            calls.push(giver);
        });
        expect(calls).toHaveLength(0);
    });
});
