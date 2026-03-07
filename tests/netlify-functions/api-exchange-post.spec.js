import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('api-exchange-post', () => {
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
        process.env.MONGODB_COLLECTION = 'legacy-names';

        client = new MongoClient(uri);
        await client.connect();

        const module = await import('../../netlify/functions/api-exchange-post.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        const db = client.db('test-db');
        await db.collection('users').deleteMany({});
        await db.collection('exchanges').deleteMany({});
    });

    afterAll(async () => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        process.env = originalEnv;
        await client.close();
        await mongoServer.stop();
    });

    function buildEvent(body) {
        return {
            httpMethod: 'POST',
            body: JSON.stringify(body),
        };
    }

    const exchangePayload = {
        exchangeId: 'test-exchange-123',
        isSecretSanta: true,
        houses: [
            {id: 'house1', name: 'Group 1', members: ['Alex', 'Whitney']},
        ],
        participants: [
            {name: 'Alex', email: 'alex@test.com'},
            {name: 'Whitney', email: 'whitney@test.com'},
            {name: 'Hunter', email: 'hunter@test.com'},
        ],
        assignments: [
            {giver: 'Alex', recipient: 'Whitney'},
            {giver: 'Whitney', recipient: 'Hunter'},
            {giver: 'Hunter', recipient: 'Alex'},
        ],
    };

    it('returns 405 for non-POST requests', async () => {
        const event = {httpMethod: 'GET', body: '{}'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('upserts users by email and creates exchange document', async () => {
        const event = buildEvent(exchangePayload);
        const response = await handler(event);

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.exchangeId).toBe('test-exchange-123');
        expect(body.participants).toHaveLength(3);

        // Verify users were created
        const db = client.db('test-db');
        const users = await db.collection('users').find({}).toArray();
        expect(users).toHaveLength(3);
        expect(users.find(u => u.email === 'alex@test.com').name).toBe('Alex');
    });

    it('returns tokens for each participant', async () => {
        const event = buildEvent(exchangePayload);
        const response = await handler(event);
        const body = JSON.parse(response.body);

        body.participants.forEach(p => {
            expect(p.token).toBeDefined();
            expect(p.token).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            );
        });
    });

    it('preserves existing user token on upsert', async () => {
        const db = client.db('test-db');
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            token: '320ab4d9-1f67-4288-aa87-51790d2a87cb',
            wishlists: [{url: 'https://amazon.com/wishlist', title: 'My List'}],
            wishItems: [],
        });

        const event = buildEvent(exchangePayload);
        const response = await handler(event);
        const body = JSON.parse(response.body);

        const alexParticipant = body.participants.find(p => p.name === 'Alex');
        expect(alexParticipant.token).toBe('320ab4d9-1f67-4288-aa87-51790d2a87cb');

        // Verify wishlists were preserved
        const user = await db.collection('users').findOne({email: 'alex@test.com'});
        expect(user.wishlists).toHaveLength(1);
        expect(user.wishlists[0].url).toBe('https://amazon.com/wishlist');
    });

    it('creates exchange document with user ObjectIds', async () => {
        const event = buildEvent(exchangePayload);
        await handler(event);

        const db = client.db('test-db');
        const exchange = await db.collection('exchanges').findOne({exchangeId: 'test-exchange-123'});

        expect(exchange).toBeDefined();
        expect(exchange.isSecretSanta).toBe(true);
        expect(exchange.createdAt).toBeInstanceOf(Date);
        expect(exchange.participants).toHaveLength(3);
        expect(exchange.assignments).toHaveLength(3);
        expect(exchange.houses).toHaveLength(1);
        expect(exchange.houses[0].name).toBe('Group 1');
        expect(exchange.houses[0].members).toHaveLength(2);
    });

    it('exchange assignments reference correct user ObjectIds', async () => {
        const event = buildEvent(exchangePayload);
        await handler(event);

        const db = client.db('test-db');
        const exchange = await db.collection('exchanges').findOne({exchangeId: 'test-exchange-123'});
        const users = await db.collection('users').find({}).toArray();

        const alex = users.find(u => u.email === 'alex@test.com');
        const whitney = users.find(u => u.email === 'whitney@test.com');

        const alexAssignment = exchange.assignments.find(a => a.giverId.equals(alex._id));
        expect(alexAssignment.recipientId.equals(whitney._id)).toBe(true);
    });

    it('returns 400 for invalid participant email', async () => {
        const event = buildEvent({
            ...exchangePayload,
            participants: [
                {name: 'Alex', email: 'not-an-email'},
                {name: 'Whitney', email: 'whitney@test.com'},
                {name: 'Hunter', email: 'hunter@test.com'},
            ],
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 when assignment giver is not in participants', async () => {
        const event = buildEvent({
            ...exchangePayload,
            assignments: [
                {giver: 'Nobody', recipient: 'Whitney'},
                {giver: 'Whitney', recipient: 'Hunter'},
                {giver: 'Hunter', recipient: 'Alex'},
            ],
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 when assignment recipient is not in participants', async () => {
        const event = buildEvent({
            ...exchangePayload,
            assignments: [
                {giver: 'Alex', recipient: 'Ghost'},
                {giver: 'Whitney', recipient: 'Hunter'},
                {giver: 'Hunter', recipient: 'Alex'},
            ],
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for missing required fields', async () => {
        const event = buildEvent({isSecretSanta: true});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toContain('Missing required field');
    });

    it('updates user name on upsert if different', async () => {
        const db = client.db('test-db');
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Old Name',
            token: '1baedbd5-ef8e-40c8-a2d8-3e4555064e2a',
            wishlists: [],
            wishItems: [],
        });

        const event = buildEvent(exchangePayload);
        await handler(event);

        const user = await db.collection('users').findOne({email: 'alex@test.com'});
        expect(user.name).toBe('Alex');
    });
});
