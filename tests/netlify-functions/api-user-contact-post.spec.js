import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {MongoClient, ObjectId} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';

describe('api-user-contact-post', () => {
    let mongoServer;
    let client;
    let handler;
    let originalEnv;
    let consoleLogSpy;
    let consoleErrorSpy;
    let mockFetch;

    beforeAll(async () => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        originalEnv = {...process.env};

        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();

        process.env.MONGO_DB_URI = uri;
        process.env.MONGODB_DATABASE = 'test-db';
        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret';

        client = new MongoClient(uri);
        await client.connect();

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-user-contact-post.mjs');
        handler = module.handler;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterEach(async () => {
        const db = client.db('test-db');
        await db.collection('users').deleteMany({});
        await db.collection('exchanges').deleteMany({});
    });

    afterAll(async () => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        vi.unstubAllGlobals();
        process.env = originalEnv;
        await client.close();
        await mongoServer.stop();
    });

    function buildEvent(token, body) {
        return {
            httpMethod: 'POST',
            path: `/api/user/${token}/contact`,
            body: JSON.stringify(body),
        };
    }

    it('returns 405 for non-POST requests', async () => {
        const event = {httpMethod: 'GET', path: '/api/user/token/contact'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 401 for unknown token', async () => {
        const event = buildEvent('nonexistent-token', {address: '123 Main St'});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('emails givers with contact info', async () => {
        const db = client.db('test-db');
        const recipientId = new ObjectId();
        const giverId = new ObjectId();

        await db.collection('users').insertMany([
            {
                _id: recipientId,
                email: 'recipient@test.com',
                name: 'Whitney',
                token: 'dcb7622e-56a5-4f0c-a991-8644b5539e8d',
                wishlists: [],
                wishItems: [],
            },
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: '985dec2e-d843-418d-bf64-897de3444a3a',
                wishlists: [],
                wishItems: [],
            },
        ]);

        await db.collection('exchanges').insertOne({
            exchangeId: 'exchange-contact',
            createdAt: new Date(),
            isSecretSanta: true,
            participants: [recipientId, giverId],
            assignments: [{giverId: giverId, recipientId: recipientId}],
            houses: [],
        });

        const event = buildEvent('dcb7622e-56a5-4f0c-a991-8644b5539e8d', {
            address: '123 Main St, Springfield',
            phone: '555-1234',
            notes: 'Leave at front door',
        });

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);

        // Verify email was sent to giver
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[0]).toBe('https://test.netlify.app/.netlify/functions/emails/contact-info');

        const emailBody = JSON.parse(fetchCall[1].body);
        expect(emailBody.to).toBe('giver@test.com');
        expect(emailBody.parameters.recipientName).toBe('Whitney');
        expect(emailBody.parameters.address).toBe('123 Main St, Springfield');
        expect(emailBody.parameters.phone).toBe('555-1234');
        expect(emailBody.parameters.notes).toBe('Leave at front door');
    });

    it('stores NOTHING in the database', async () => {
        const db = client.db('test-db');
        const recipientId = new ObjectId();
        const giverId = new ObjectId();

        const originalRecipient = {
            _id: recipientId,
            email: 'recipient@test.com',
            name: 'Whitney',
            token: '71e95b93-6a56-4113-98fb-efdd6718a756',
            wishlists: [],
            wishItems: [],
        };

        await db.collection('users').insertMany([
            {...originalRecipient},
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: 'f75cde68-a270-4578-acdc-2033b361dd44',
                wishlists: [],
                wishItems: [],
            },
        ]);

        await db.collection('exchanges').insertOne({
            exchangeId: 'exchange-no-store',
            createdAt: new Date(),
            isSecretSanta: true,
            participants: [recipientId, giverId],
            assignments: [{giverId: giverId, recipientId: recipientId}],
            houses: [],
        });

        await handler(buildEvent('71e95b93-6a56-4113-98fb-efdd6718a756', {
            address: '123 Main St',
            phone: '555-0000',
            notes: 'Secret info',
        }));

        // Verify user document was NOT modified
        const user = await db.collection('users').findOne({token: '71e95b93-6a56-4113-98fb-efdd6718a756'});
        expect(user.address).toBeUndefined();
        expect(user.phone).toBeUndefined();
        expect(user.notes).toBeUndefined();
        expect(user.contactInfo).toBeUndefined();
    });

    it('defaults missing contact fields to fallback text', async () => {
        const db = client.db('test-db');
        const recipientId = new ObjectId();
        const giverId = new ObjectId();

        await db.collection('users').insertMany([
            {
                _id: recipientId,
                email: 'recipient@test.com',
                name: 'Whitney',
                token: '4965243d-ed7a-41c7-849d-2f7737c945f1',
                wishlists: [],
                wishItems: [],
            },
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: '2a6f0c41-4bc9-4e77-adbf-6fea2d35d029',
                wishlists: [],
                wishItems: [],
            },
        ]);

        await db.collection('exchanges').insertOne({
            exchangeId: 'exchange-defaults',
            createdAt: new Date(),
            isSecretSanta: true,
            participants: [recipientId, giverId],
            assignments: [{giverId: giverId, recipientId: recipientId}],
            houses: [],
        });

        // Send with no fields
        const event = buildEvent('4965243d-ed7a-41c7-849d-2f7737c945f1', {});
        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const emailBody = JSON.parse(fetchCall[1].body);
        expect(emailBody.parameters.address).toBe('Not provided');
        expect(emailBody.parameters.phone).toBe('Not provided');
        expect(emailBody.parameters.notes).toBe('None');
    });
});
