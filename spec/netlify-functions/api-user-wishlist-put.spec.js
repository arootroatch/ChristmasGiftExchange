import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, makeExchange, alex, seedUsers, seedExchange} from '../shared/testData.js';
import {authCookie, buildEvent} from '../shared/specHelper.js';

describe('api-user-wishlist-put', () => {
    let client, db, handler;
    let mongo;
    let mockFetch;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);

        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';
        process.env.JWT_SECRET = 'test-secret';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-user-wishlist-put.mjs');
        handler = module.handler;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges', 'rateLimits');
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
        delete process.env.CONTEXT;
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    it('returns 405 for non-PUT requests', async () => {
        const event = buildEvent('POST');
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 401 when cookie is missing', async () => {
        const event = buildEvent('PUT', {body: {wishlists: [], wishItems: []}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('returns 400 for invalid body', async () => {
        await seedUsers(db, alex);
        const cookie = await authCookie(alex._id);

        const event = buildEvent('PUT', {
            body: {wishlists: 'not-an-array'},
            headers: {cookie},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('saves wishlists and wishItems to user doc', async () => {
        await seedUsers(db, alex);
        const cookie = await authCookie(alex._id);

        const event = buildEvent('PUT', {
            body: {
                wishlists: [{url: 'https://amazon.com/list', title: 'My Amazon List'}],
                wishItems: [{url: 'https://amazon.com/item', title: 'Cool Gadget', price: 3000}],
                currency: 'USD',
            },
            headers: {cookie},
        });

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);

        const updated = await db.collection('users').findOne({_id: alex._id});
        expect(updated.wishlists).toHaveLength(1);
        expect(updated.wishlists[0].url).toBe('https://amazon.com/list');
        expect(updated.wishItems).toHaveLength(1);
        expect(updated.wishItems[0].title).toBe('Cool Gadget');
        expect(updated.currency).toBe('USD');
    });

    it('returns notifiedGivers false when wishlists were already populated', async () => {
        const recipient = makeUser({
            name: 'Whitney',
            email: 'recipient@test.com',
            wishlists: [{url: 'https://existing.com', title: 'Existing'}],
        });
        const giver = makeUser({name: 'Alex', email: 'giver@test.com'});

        await seedUsers(db, recipient, giver);
        await seedExchange(db, makeExchange({
            exchangeId: 'exchange-2',
            isSecretSanta: true,
            participants: [recipient._id, giver._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));

        const cookie = await authCookie(recipient._id);
        const event = buildEvent('PUT', {
            body: {
                wishlists: [
                    {url: 'https://existing.com', title: 'Existing'},
                    {url: 'https://new.com', title: 'New List'},
                ],
                wishItems: [],
            },
            headers: {cookie},
        });

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.notifiedGivers).toBe(false);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('notifies givers when first wishlist added', async () => {
        const recipient = makeUser({name: 'Whitney', email: 'recipient@test.com'});
        const giver = makeUser({name: 'Alex', email: 'giver@test.com'});

        await seedUsers(db, recipient, giver);
        await seedExchange(db, makeExchange({
            exchangeId: 'exchange-1',
            isSecretSanta: true,
            participants: [recipient._id, giver._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));

        const cookie = await authCookie(recipient._id);
        const event = buildEvent('PUT', {
            body: {
                wishlists: [{url: 'https://amazon.com/list', title: 'My List'}],
                wishItems: [],
            },
            headers: {cookie},
        });

        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.notifiedGivers).toBe(true);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[0]).toBe('https://api.postmarkapp.com/email');
        const emailBody = JSON.parse(fetchCall[1].body);
        expect(emailBody.To).toBe('giver@test.com');
        expect(emailBody.HtmlBody).toContain('Whitney');
    });
});
