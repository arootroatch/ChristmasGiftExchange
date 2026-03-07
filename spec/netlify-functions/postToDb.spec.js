import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('postToDb', () => {
    let db, handler;
    let mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        const module = await import('../../netlify/functions/postToDb.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, process.env.MONGODB_COLLECTION);
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    describe('handler', () => {
        it('successfully inserts documents and returns 200', async () => {
            const docs = [
                {name: 'Alex', recipient: 'Whitney', email: 'alex@test.com'},
                {name: 'Whitney', recipient: 'Hunter', email: 'whitney@test.com'},
            ];

            const event = {
                body: JSON.stringify(docs),
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            expect(response.result.acknowledged).toBe(true);
            expect(response.result.insertedCount).toBe(2);

            // Verify documents were actually inserted
            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs).toHaveLength(2);
            expect(insertedDocs[0].name).toBe('Alex');
            expect(insertedDocs[1].name).toBe('Whitney');
        });

        it('parses JSON body correctly', async () => {
            const docs = [
                {name: 'Alex', recipient: 'Whitney'},
                {name: 'Hunter', recipient: 'Alex'},
            ];

            const event = {
                body: JSON.stringify(docs),
            };

            await handler(event);

            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs).toHaveLength(2);
            expect(insertedDocs[0].name).toBe('Alex');
            expect(insertedDocs[0].recipient).toBe('Whitney');
            expect(insertedDocs[1].name).toBe('Hunter');
            expect(insertedDocs[1].recipient).toBe('Alex');
        });

        it('rejects with error for empty array of documents', async () => {
            const event = {
                body: JSON.stringify([]),
            };

            // MongoDB's insertMany throws error on empty array
            // The handler's promise chain doesn't catch this, so it rejects
            await expect(handler(event)).rejects.toThrow('Batch cannot be empty');
        });

        it('handles single document', async () => {
            const docs = [{name: 'Alex', recipient: 'Whitney', email: 'alex@test.com'}];
            const event = {
                body: JSON.stringify(docs),
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            expect(response.result.insertedCount).toBe(1);

            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs).toHaveLength(1);
            expect(insertedDocs[0].name).toBe('Alex');
        });

        it('handles multiple documents', async () => {
            const docs = [
                {name: 'Alex', recipient: 'Whitney'},
                {name: 'Whitney', recipient: 'Hunter'},
                {name: 'Hunter', recipient: 'Megan'},
                {name: 'Megan', recipient: 'Alex'},
            ];

            const event = {
                body: JSON.stringify(docs),
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            expect(response.result.insertedCount).toBe(4);

            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs).toHaveLength(4);
        });

        it('stores documents with all fields intact', async () => {
            const docs = [{
                name: 'Test User',
                recipient: 'Another User',
                email: 'test@example.com',
                date: new Date('2024-12-01'),
            }];

            const event = {
                body: JSON.stringify(docs),
            };

            await handler(event);

            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs[0].name).toBe('Test User');
            expect(insertedDocs[0].recipient).toBe('Another User');
            expect(insertedDocs[0].email).toBe('test@example.com');
            // Dates are serialized to strings when passed through JSON.stringify
            expect(insertedDocs[0].date).toBe('2024-12-01T00:00:00.000Z');
        });

        it('handles special characters in names', async () => {
            const docs = [{
                name: "O'Brien",
                recipient: 'José García',
                email: 'obrien@test.com',
            }];

            const event = {
                body: JSON.stringify(docs),
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);

            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs[0].name).toBe("O'Brien");
            expect(insertedDocs[0].recipient).toBe('José García');
        });
    });
});
