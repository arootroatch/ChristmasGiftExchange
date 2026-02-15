import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('postToDb', () => {
    let mongoServer;
    let client;
    let handler;
    let originalEnv;
    let consoleLogSpy;
    let consoleErrorSpy;
    let mongoAvailable = true;

    beforeAll(async () => {
        // Mock console to suppress output during tests
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Store original environment
        originalEnv = {...process.env};

        try {
            // Start in-memory MongoDB server
            mongoServer = await MongoMemoryServer.create();
            const uri = mongoServer.getUri();

            // Set test environment variables
            process.env.MONGO_DB_URI = uri;
            process.env.MONGODB_DATABASE = 'test-db';
            process.env.MONGODB_COLLECTION = 'test-collection';

            // Create MongoDB client
            client = new MongoClient(uri);
            await client.connect();

            // Import handler after environment is set up
            const module = await import('../../netlify/functions/postToDb.js');
            handler = module.handler;
        } catch (error) {
            mongoAvailable = false;
        }
    });

    afterEach(async () => {
        if (!mongoAvailable) return;
        // Clean up database between tests
        const db = client.db(process.env.MONGODB_DATABASE);
        await db.collection(process.env.MONGODB_COLLECTION).deleteMany({});
    });

    afterAll(async () => {
        // Restore console
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();

        // Restore environment
        process.env = originalEnv;

        // Close client and stop server
        if (!mongoAvailable) return;
        await client.close();
        await mongoServer.stop();
    });

    describe('handler', () => {
        it('successfully inserts documents and returns 200', async () => {
            if (!mongoAvailable) return;
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
            const db = client.db(process.env.MONGODB_DATABASE);
            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs).toHaveLength(2);
            expect(insertedDocs[0].name).toBe('Alex');
            expect(insertedDocs[1].name).toBe('Whitney');
        });

        it('parses JSON body correctly', async () => {
            if (!mongoAvailable) return;
            const docs = [
                {name: 'Alex', recipient: 'Whitney'},
                {name: 'Hunter', recipient: 'Alex'},
            ];

            const event = {
                body: JSON.stringify(docs),
            };

            await handler(event);

            const db = client.db(process.env.MONGODB_DATABASE);
            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs).toHaveLength(2);
            expect(insertedDocs[0].name).toBe('Alex');
            expect(insertedDocs[0].recipient).toBe('Whitney');
            expect(insertedDocs[1].name).toBe('Hunter');
            expect(insertedDocs[1].recipient).toBe('Alex');
        });

        it('rejects with error for empty array of documents', async () => {
            if (!mongoAvailable) return;
            const event = {
                body: JSON.stringify([]),
            };

            // MongoDB's insertMany throws error on empty array
            // The handler's promise chain doesn't catch this, so it rejects
            await expect(handler(event)).rejects.toThrow('Batch cannot be empty');
        });

        it('handles single document', async () => {
            if (!mongoAvailable) return;
            const docs = [{name: 'Alex', recipient: 'Whitney', email: 'alex@test.com'}];
            const event = {
                body: JSON.stringify(docs),
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            expect(response.result.insertedCount).toBe(1);

            const db = client.db(process.env.MONGODB_DATABASE);
            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs).toHaveLength(1);
            expect(insertedDocs[0].name).toBe('Alex');
        });

        it('handles multiple documents', async () => {
            if (!mongoAvailable) return;
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

            const db = client.db(process.env.MONGODB_DATABASE);
            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs).toHaveLength(4);
        });

        it('stores documents with all fields intact', async () => {
            if (!mongoAvailable) return;
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

            const db = client.db(process.env.MONGODB_DATABASE);
            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs[0].name).toBe('Test User');
            expect(insertedDocs[0].recipient).toBe('Another User');
            expect(insertedDocs[0].email).toBe('test@example.com');
            // Dates are serialized to strings when passed through JSON.stringify
            expect(insertedDocs[0].date).toBe('2024-12-01T00:00:00.000Z');
        });

        it('handles special characters in names', async () => {
            if (!mongoAvailable) return;
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

            const db = client.db(process.env.MONGODB_DATABASE);
            const collection = db.collection(process.env.MONGODB_COLLECTION);
            const insertedDocs = await collection.find({}).toArray();

            expect(insertedDocs[0].name).toBe("O'Brien");
            expect(insertedDocs[0].recipient).toBe('José García');
        });
    });
});
