import {describe, expect, it, vi, beforeAll, afterAll, afterEach} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';
import {ObjectId} from 'mongodb';

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
        const recipientId = new ObjectId();
        const oldGiverId = new ObjectId();
        const newGiverId = new ObjectId();

        await db.collection('users').insertMany([
            {_id: recipientId, name: 'Bob', email: 'bob@test.com', wishlists: [], wishItems: []},
            {_id: oldGiverId, name: 'OldAlice', email: 'old@test.com', wishlists: [], wishItems: []},
            {_id: newGiverId, name: 'NewAlice', email: 'new@test.com', wishlists: [], wishItems: []},
        ]);

        await db.collection('exchanges').insertMany([
            {
                exchangeId: 'old-exchange',
                createdAt: new Date('2025-01-01'),
                isSecretSanta: true,
                participants: [oldGiverId, recipientId],
                assignments: [{giverId: oldGiverId, recipientId}],
                houses: [],
            },
            {
                exchangeId: 'new-exchange',
                createdAt: new Date('2026-01-01'),
                isSecretSanta: true,
                participants: [newGiverId, recipientId],
                assignments: [{giverId: newGiverId, recipientId}],
                houses: [],
            },
        ]);

        const calls = [];
        await forEachGiverOf({_id: recipientId}, ({giver, exchange}) => {
            calls.push({giverName: giver.name, exchangeId: exchange.exchangeId});
        });

        expect(calls).toHaveLength(1);
        expect(calls[0].giverName).toBe('NewAlice');
        expect(calls[0].exchangeId).toBe('new-exchange');
    });

    it('does nothing when user has no exchanges', async () => {
        const recipientId = new ObjectId();
        const calls = [];
        await forEachGiverOf({_id: recipientId}, ({giver}) => {
            calls.push(giver);
        });
        expect(calls).toHaveLength(0);
    });
});
