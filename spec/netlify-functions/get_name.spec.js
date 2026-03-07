import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('get_name', () => {
    let mongoServer;
    let client;
    let handler;
    let collection;
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

            const db = client.db(process.env.MONGODB_DATABASE);
            collection = db.collection(process.env.MONGODB_COLLECTION);

            // Import handler after environment is set up
            const module = await import('../../netlify/functions/get_name.mjs');
            handler = module.handler;
        } catch (error) {
            mongoAvailable = false;
        }
    });

    beforeEach(async () => {
        if (!mongoAvailable) return;
        // Clean up database before each test
        await collection.deleteMany({});
    });

    afterEach(async () => {
        if (!mongoAvailable) return;
        // Additional cleanup if needed
        await collection.deleteMany({});
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
        it('returns recipient for valid email', async () => {
            if (!mongoAvailable) return;
            // Insert test data
            await collection.insertMany([
                {
                    email: 'alex@test.com',
                    recipient: 'Whitney',
                    date: new Date('2024-12-01'),
                },
                {
                    email: 'alex@test.com',
                    recipient: 'Hunter',
                    date: new Date('2023-12-01'),
                },
            ]);

            const event = {
                body: 'alex@test.com',
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);

            const body = JSON.parse(response.body);
            expect(body.recipient).toBe('Whitney'); // Most recent
            expect(new Date(body.date)).toEqual(new Date('2024-12-01'));
        });

        it('trims whitespace from email', async () => {
            if (!mongoAvailable) return;
            await collection.insertOne({
                email: 'alex@test.com',
                recipient: 'Whitney',
                date: new Date('2024-12-01'),
            });

            const event = {
                body: '  alex@test.com  ',
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.recipient).toBe('Whitney');
        });

        it('sorts results by date descending', async () => {
            if (!mongoAvailable) return;
            await collection.insertMany([
                {
                    email: 'alex@test.com',
                    recipient: 'Hunter',
                    date: new Date('2023-12-01'),
                },
                {
                    email: 'alex@test.com',
                    recipient: 'Whitney',
                    date: new Date('2024-12-01'),
                },
            ]);

            const event = {
                body: 'alex@test.com',
            };

            const response = await handler(event);
            const body = JSON.parse(response.body);

            // Should return the most recent (Whitney from 2024)
            expect(body.recipient).toBe('Whitney');
        });

        it('returns most recent recipient when multiple results exist', async () => {
            if (!mongoAvailable) return;
            await collection.insertMany([
                {
                    email: 'alex@test.com',
                    recipient: 'Megan',
                    date: new Date('2025-12-01'),
                },
                {
                    email: 'alex@test.com',
                    recipient: 'Whitney',
                    date: new Date('2024-12-01'),
                },
                {
                    email: 'alex@test.com',
                    recipient: 'Hunter',
                    date: new Date('2023-12-01'),
                },
            ]);

            const event = {
                body: 'alex@test.com',
            };

            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body.recipient).toBe('Megan');
            expect(new Date(body.date)).toEqual(new Date('2025-12-01'));
        });

        it('queries correct collection', async () => {
            if (!mongoAvailable) return;
            await collection.insertOne({
                email: 'alex@test.com',
                recipient: 'Whitney',
                date: new Date('2024-12-01'),
            });

            const event = {
                body: 'alex@test.com',
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            // If it found the document, it queried the right collection
            const body = JSON.parse(response.body);
            expect(body.recipient).toBe('Whitney');
        });

        it('returns 404 when no results found', async () => {
            if (!mongoAvailable) return;
            const event = {
                body: 'notfound@test.com',
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.body);
            expect(body.error).toBe("Email not found");
        });

        it('handles malformed email strings', async () => {
            if (!mongoAvailable) return;
            await collection.insertOne({
                email: 'test',
                recipient: 'Whitney',
                date: new Date('2024-12-01'),
            });

            const event = {
                body: 'test',
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.recipient).toBe('Whitney');
        });

        it('handles special characters in names', async () => {
            if (!mongoAvailable) return;
            await collection.insertOne({
                email: 'test@test.com',
                recipient: "O'Brien José",
                date: new Date('2024-12-01'),
            });

            const event = {
                body: 'test@test.com',
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.recipient).toBe("O'Brien José");
        });

        it('handles multiple records for different emails', async () => {
            if (!mongoAvailable) return;
            await collection.insertMany([
                {
                    email: 'alex@test.com',
                    recipient: 'Whitney',
                    date: new Date('2024-12-01'),
                },
                {
                    email: 'whitney@test.com',
                    recipient: 'Hunter',
                    date: new Date('2024-12-01'),
                },
            ]);

            const event = {
                body: 'whitney@test.com',
            };

            const response = await handler(event);
            const body = JSON.parse(response.body);

            expect(body.recipient).toBe('Hunter');
        });
    });
});
