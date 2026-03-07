import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-user-contact-post', () => {
    let client, db, handler;
    let mongo;
    let mockFetch;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);

        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-user-contact-post.mjs');
        handler = module.handler;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges');
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.URL;
        delete process.env.NETLIFY_EMAILS_SECRET;
        await teardownMongo(mongo);
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

        const recipientId = new ObjectId();
        const giverId = new ObjectId();
        const recipientToken = crypto.randomUUID();
        const giverToken = crypto.randomUUID();

        await db.collection('users').insertMany([
            {
                _id: recipientId,
                email: 'recipient@test.com',
                name: 'Whitney',
                token: recipientToken,
                wishlists: [],
                wishItems: [],
            },
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: giverToken,
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

        const event = buildEvent(recipientToken, {
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

        const recipientId = new ObjectId();
        const giverId = new ObjectId();
        const recipientToken = crypto.randomUUID();
        const giverToken = crypto.randomUUID();

        const originalRecipient = {
            _id: recipientId,
            email: 'recipient@test.com',
            name: 'Whitney',
            token: recipientToken,
            wishlists: [],
            wishItems: [],
        };

        await db.collection('users').insertMany([
            {...originalRecipient},
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: giverToken,
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

        await handler(buildEvent(recipientToken, {
            address: '123 Main St',
            phone: '555-0000',
            notes: 'Secret info',
        }));

        // Verify user document was NOT modified
        const user = await db.collection('users').findOne({token: recipientToken});
        expect(user.address).toBeUndefined();
        expect(user.phone).toBeUndefined();
        expect(user.notes).toBeUndefined();
        expect(user.contactInfo).toBeUndefined();
    });

    it('defaults missing contact fields to fallback text', async () => {

        const recipientId = new ObjectId();
        const giverId = new ObjectId();
        const recipientToken = crypto.randomUUID();
        const giverToken = crypto.randomUUID();

        await db.collection('users').insertMany([
            {
                _id: recipientId,
                email: 'recipient@test.com',
                name: 'Whitney',
                token: recipientToken,
                wishlists: [],
                wishItems: [],
            },
            {
                _id: giverId,
                email: 'giver@test.com',
                name: 'Alex',
                token: giverToken,
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
        const event = buildEvent(recipientToken, {});
        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const emailBody = JSON.parse(fetchCall[1].body);
        expect(emailBody.parameters.address).toBe('Not provided');
        expect(emailBody.parameters.phone).toBe('Not provided');
        expect(emailBody.parameters.notes).toBe('None');
    });
});
