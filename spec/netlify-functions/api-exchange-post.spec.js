import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-exchange-post', () => {
    let client, db, handler;
    let mongo;
    let mockFetch;

    async function authCookie(userId) {
        const {signSession} = await import('../../netlify/shared/jwt.mjs');
        const jwt = await signSession(userId.toString());
        return `session=${jwt}`;
    }

    function buildEvent(body, headers = {}) {
        return {
            httpMethod: 'POST',
            body: JSON.stringify(body),
            path: '/.netlify/functions/api-exchange-post',
            headers,
        };
    }

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';
        process.env.JWT_SECRET = 'test-secret';
        mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        vi.stubGlobal('fetch', mockFetch);
        const module = await import('../../netlify/functions/api-exchange-post.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges');
        mockFetch.mockClear();
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
        delete process.env.CONTEXT;
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    async function insertOrganizer() {
        const result = await db.collection('users').insertOne({
            name: 'Organizer',
            email: 'organizer@test.com',
            wishlists: [],
            wishItems: [],
        });
        return result.insertedId;
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

    it('returns 401 for request without session cookie', async () => {
        const event = buildEvent(exchangePayload);
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('upserts users by email and creates exchange document', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent(exchangePayload, {cookie});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.exchangeId).toBe('test-exchange-123');
        expect(body.participants).toHaveLength(3);

        // Verify users were created
        const users = await db.collection('users').find({}).toArray();
        // 3 participants + 1 organizer (may overlap if organizer email matches)
        expect(users.length).toBeGreaterThanOrEqual(3);
        expect(users.find(u => u.email === 'alex@test.com').name).toBe('Alex');
    });

    it('does not return tokens in response', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent(exchangePayload, {cookie});
        const response = await handler(event);
        const body = JSON.parse(response.body);

        body.participants.forEach(p => {
            expect(p.token).toBeUndefined();
        });
    });

    it('preserves existing user data on upsert', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Alex',
            wishlists: [{url: 'https://amazon.com/wishlist', title: 'My List'}],
            wishItems: [],
        });

        const event = buildEvent(exchangePayload, {cookie});
        await handler(event);

        // Verify wishlists were preserved in DB
        const user = await db.collection('users').findOne({email: 'alex@test.com'});
        expect(user.wishlists).toHaveLength(1);
        expect(user.wishlists[0].url).toBe('https://amazon.com/wishlist');
    });

    it('creates exchange document with user ObjectIds', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent(exchangePayload, {cookie});
        await handler(event);

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

    it('stores organizer ObjectId on exchange document', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent(exchangePayload, {cookie});
        await handler(event);

        const exchange = await db.collection('exchanges').findOne({exchangeId: 'test-exchange-123'});

        expect(exchange.organizer.equals(organizerId)).toBe(true);
    });

    it('exchange assignments reference correct user ObjectIds', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent(exchangePayload, {cookie});
        await handler(event);

        const exchange = await db.collection('exchanges').findOne({exchangeId: 'test-exchange-123'});
        const users = await db.collection('users').find({}).toArray();

        const alex = users.find(u => u.email === 'alex@test.com');
        const whitney = users.find(u => u.email === 'whitney@test.com');

        const alexAssignment = exchange.assignments.find(a => a.giverId.equals(alex._id));
        expect(alexAssignment.recipientId.equals(whitney._id)).toBe(true);
    });

    it('returns 400 for invalid participant email', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent({
            ...exchangePayload,
            participants: [
                {name: 'Alex', email: 'not-an-email'},
                {name: 'Whitney', email: 'whitney@test.com'},
                {name: 'Hunter', email: 'hunter@test.com'},
            ],
        }, {cookie});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 when assignment giver is not in participants', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent({
            ...exchangePayload,
            assignments: [
                {giver: 'Nobody', recipient: 'Whitney'},
                {giver: 'Whitney', recipient: 'Hunter'},
                {giver: 'Hunter', recipient: 'Alex'},
            ],
        }, {cookie});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 when assignment recipient is not in participants', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent({
            ...exchangePayload,
            assignments: [
                {giver: 'Alex', recipient: 'Ghost'},
                {giver: 'Whitney', recipient: 'Hunter'},
                {giver: 'Hunter', recipient: 'Alex'},
            ],
        }, {cookie});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for missing required fields', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent({isSecretSanta: true}, {cookie});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toContain('Missing required field');
    });

    it('returns 400 when participants have duplicate emails', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent({
            ...exchangePayload,
            participants: [
                {name: 'Alex', email: 'same@test.com'},
                {name: 'Whitney', email: 'same@test.com'},
                {name: 'Hunter', email: 'hunter@test.com'},
            ],
        }, {cookie});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toContain('unique');
    });

    it('returns 400 when participant emails differ only by case', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent({
            ...exchangePayload,
            participants: [
                {name: 'Alex', email: 'Same@Test.com'},
                {name: 'Whitney', email: 'same@test.com'},
                {name: 'Hunter', email: 'hunter@test.com'},
            ],
        }, {cookie});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns emailsFailed as empty array when all emails succeed', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        const event = buildEvent(exchangePayload, {cookie});
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.emailsFailed).toEqual([]);
    });

    it('updates user name on upsert if different', async () => {
        const organizerId = await insertOrganizer();
        const cookie = await authCookie(organizerId);
        await db.collection('users').insertOne({
            email: 'alex@test.com',
            name: 'Old Name',
            wishlists: [],
            wishItems: [],
        });

        const event = buildEvent(exchangePayload, {cookie});
        await handler(event);

        const user = await db.collection('users').findOne({email: 'alex@test.com'});
        expect(user.name).toBe('Alex');
    });
});
