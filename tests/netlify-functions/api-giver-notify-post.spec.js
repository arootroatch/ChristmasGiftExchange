import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {MongoClient} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';
import crypto from 'crypto';

describe('api-giver-notify-post', () => {
    let mongoServer;
    let client;
    let handler;
    let mockFetch;
    let originalEnv;
    let consoleLogSpy;
    let consoleErrorSpy;

    const alexToken = crypto.randomUUID();
    const whitneyToken = crypto.randomUUID();
    const hunterToken = crypto.randomUUID();

    beforeAll(async () => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        originalEnv = {...process.env};

        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        process.env.MONGO_DB_URI = uri;
        process.env.MONGODB_DATABASE = 'test-db';
        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret-key';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        client = new MongoClient(uri);
        await client.connect();

        const module = await import('../../netlify/functions/api-giver-notify-post.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        mockFetch.mockClear();
        const db = client.db('test-db');
        await db.collection('users').insertMany([
            {name: 'Alex', email: 'alex@test.com', token: alexToken, wishlists: [], wishItems: []},
            {name: 'Whitney', email: 'whitney@test.com', token: whitneyToken, wishlists: [], wishItems: []},
            {name: 'Hunter', email: 'hunter@test.com', token: hunterToken, wishlists: [], wishItems: []},
        ]);
    });

    afterEach(async () => {
        const db = client.db('test-db');
        await db.collection('users').deleteMany({});
    });

    afterAll(async () => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        vi.unstubAllGlobals();
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

    const bulkPayload = {
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

    it('returns 400 for missing required fields', async () => {
        const event = buildEvent({participants: []});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid participant email', async () => {
        const event = buildEvent({
            participants: [{name: 'Alex', email: 'not-an-email'}],
            assignments: [{giver: 'Alex', recipient: 'Whitney'}],
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('sends one email per assignment with correct parameters', async () => {
        const event = buildEvent(bulkPayload);
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(3);

        const calls = mockFetch.mock.calls;
        const bodies = calls.map(c => JSON.parse(c[1].body));

        const alexEmail = bodies.find(b => b.parameters.name === 'Alex');
        expect(alexEmail.to).toBe('alex@test.com');
        expect(alexEmail.parameters.recipient).toBe('Whitney');
        expect(alexEmail.parameters.wishlistEditUrl).toBe(
            `https://test.netlify.app/wishlist/edit/${alexToken}`
        );
    });

    it('builds wishlistEditUrl from DB token and process.env.URL', async () => {
        const event = buildEvent(bulkPayload);
        await handler(event);

        const calls = mockFetch.mock.calls;
        const bodies = calls.map(c => JSON.parse(c[1].body));

        bodies.forEach(body => {
            const name = body.parameters.name;
            const expectedToken = {Alex: alexToken, Whitney: whitneyToken, Hunter: hunterToken}[name];
            expect(body.parameters.wishlistEditUrl).toBe(
                `https://test.netlify.app/wishlist/edit/${expectedToken}`
            );
        });
    });

    it('returns sent and total counts', async () => {
        const event = buildEvent(bulkPayload);
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.sent).toBe(3);
        expect(body.total).toBe(3);
    });

    it('counts partial failures', async () => {
        mockFetch
            .mockResolvedValueOnce({ok: true})
            .mockRejectedValueOnce(new Error('Email service down'))
            .mockResolvedValueOnce({ok: true});

        const event = buildEvent(bulkPayload);
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.sent).toBe(2);
        expect(body.total).toBe(3);
    });

    it('sets wishlistEditUrl to null when user not found in DB', async () => {
        const db = client.db('test-db');
        await db.collection('users').deleteOne({email: 'alex@test.com'});

        const event = buildEvent(bulkPayload);
        await handler(event);

        const calls = mockFetch.mock.calls;
        const bodies = calls.map(c => JSON.parse(c[1].body));
        const alexEmail = bodies.find(b => b.parameters.name === 'Alex');
        expect(alexEmail.parameters.wishlistEditUrl).toBeNull();
    });

    it('handles names with special characters', async () => {
        const db = client.db('test-db');
        await db.collection('users').insertOne({
            name: "O'Brien", email: 'obrien@test.com', token: crypto.randomUUID(), wishlists: [], wishItems: [],
        });

        const event = buildEvent({
            participants: [{name: "O'Brien", email: 'obrien@test.com'}],
            assignments: [{giver: "O'Brien", recipient: 'Whitney'}],
        });

        await handler(event);

        const call = mockFetch.mock.calls[0];
        const body = JSON.parse(call[1].body);
        expect(body.parameters.name).toBe("O'Brien");
    });
});
