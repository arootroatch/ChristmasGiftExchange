import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('api-user-get', () => {
    let mongoServer;
    let client;
    let handler;
    let originalEnv;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeAll(async () => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        originalEnv = {...process.env};

        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        process.env.MONGO_DB_URI = uri;
        process.env.MONGODB_DATABASE = 'test-db';

        client = new MongoClient(uri);
        await client.connect();

        const module = await import('../../netlify/functions/api-user-get.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        const db = client.db('test-db');
        await db.collection('users').deleteMany({});
    });

    afterAll(async () => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        process.env = originalEnv;
        await client.close();
        await mongoServer.stop();
    });

    it('returns 405 for non-GET requests', async () => {
        const event = {httpMethod: 'POST', path: '/api/user/some-token'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns user data by token', async () => {
        const db = client.db('test-db');
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            token: 'dcb7622e-56a5-4f0c-a991-8644b5539e8d',
            wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
            wishItems: [{url: 'https://amazon.com/item', title: 'Cool Thing'}],
        });

        const event = {
            httpMethod: 'GET',
            path: '/api/user/dcb7622e-56a5-4f0c-a991-8644b5539e8d',
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.name).toBe('Alex');
        expect(body.wishlists).toHaveLength(1);
        expect(body.wishlists[0].url).toBe('https://amazon.com/list');
        expect(body.wishItems).toHaveLength(1);
        expect(body.wishItems[0].title).toBe('Cool Thing');
    });

    it('returns empty arrays when user has no wishlists', async () => {
        const db = client.db('test-db');
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            token: '985dec2e-d843-418d-bf64-897de3444a3a',
        });

        const event = {
            httpMethod: 'GET',
            path: '/api/user/985dec2e-d843-418d-bf64-897de3444a3a',
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.wishlists).toEqual([]);
        expect(body.wishItems).toEqual([]);
    });

    it('returns 401 for unknown token', async () => {
        const event = {
            httpMethod: 'GET',
            path: '/api/user/nonexistent-token',
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(401);

        const body = JSON.parse(response.body);
        expect(body.error).toBe('User not found');
    });
});
