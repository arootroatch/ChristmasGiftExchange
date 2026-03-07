import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('get_name', () => {
    let db, handler;
    let mongo;
    let collection;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        collection = db.collection(process.env.MONGODB_COLLECTION);
        const module = await import('../../netlify/functions/get_name.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, process.env.MONGODB_COLLECTION);
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    describe('handler', () => {
        it('returns recipient for valid email', async () => {
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
            const event = {
                body: 'notfound@test.com',
            };

            const response = await handler(event);

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.body);
            expect(body.error).toBe("Email not found");
        });

        it('handles malformed email strings', async () => {
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
