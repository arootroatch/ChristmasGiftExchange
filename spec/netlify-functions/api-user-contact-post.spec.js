import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {ObjectId} from 'mongodb';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';
import {buildEvent, makeUser, makeExchange} from '../shared/testFactories.js';

describe('api-user-contact-post', () => {
    let client, db, handler;
    let mongo;
    let mockFetch;

    async function authCookie(userId) {
        const {signSession} = await import("../../netlify/shared/jwt.mjs");
        return `session=${await signSession(userId.toString())}`;
    }

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);

        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';
        process.env.JWT_SECRET = 'test-secret';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-user-contact-post.mjs');
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

    it('returns 405 for non-POST requests', async () => {
        const event = buildEvent('GET');
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 401 when cookie is missing', async () => {
        const event = buildEvent('POST', {body: {address: '123 Main St'}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('returns 401 for invalid session cookie', async () => {
        const event = buildEvent('POST', {
            body: {address: '123 Main St'},
            headers: {cookie: 'session=invalid-token'},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('emails givers with contact info', async () => {
        const recipient = makeUser({name: 'Whitney', email: 'recipient@test.com'});
        const giver = makeUser({name: 'Alex', email: 'giver@test.com'});

        await db.collection('users').insertMany([recipient, giver]);
        await db.collection('exchanges').insertOne(makeExchange({
            participants: [recipient._id, giver._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));

        const event = buildEvent('POST', {
            headers: {cookie: await authCookie(recipient._id)},
            body: {
                address: '123 Main St, Springfield',
                phone: '555-1234',
                notes: 'Leave at front door',
            },
        });

        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);

        // Verify email was sent to giver
        expect(mockFetch).toHaveBeenCalledTimes(1);
        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[0]).toBe('https://api.postmarkapp.com/email');

        const emailBody = JSON.parse(fetchCall[1].body);
        expect(emailBody.To).toBe('giver@test.com');
        expect(emailBody.HtmlBody).toContain('Whitney');
        expect(emailBody.HtmlBody).toContain('123 Main St, Springfield');
        expect(emailBody.HtmlBody).toContain('555-1234');
        expect(emailBody.HtmlBody).toContain('Leave at front door');
    });

    it('stores NOTHING in the database', async () => {
        const recipient = makeUser({name: 'Whitney', email: 'recipient@test.com'});
        const giver = makeUser({name: 'Alex', email: 'giver@test.com'});

        await db.collection('users').insertMany([{...recipient}, giver]);
        await db.collection('exchanges').insertOne(makeExchange({
            participants: [recipient._id, giver._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));

        await handler(buildEvent('POST', {
            headers: {cookie: await authCookie(recipient._id)},
            body: {
                address: '123 Main St',
                phone: '555-0000',
                notes: 'Secret info',
            },
        }));

        // Verify user document was NOT modified
        const user = await db.collection('users').findOne({token: recipient.token});
        expect(user.address).toBeUndefined();
        expect(user.phone).toBeUndefined();
        expect(user.notes).toBeUndefined();
        expect(user.contactInfo).toBeUndefined();
    });

    it('defaults missing contact fields to fallback text', async () => {
        const recipient = makeUser({name: 'Whitney', email: 'recipient@test.com'});
        const giver = makeUser({name: 'Alex', email: 'giver@test.com'});

        await db.collection('users').insertMany([recipient, giver]);
        await db.collection('exchanges').insertOne(makeExchange({
            participants: [recipient._id, giver._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        }));

        const event = buildEvent('POST', {
            headers: {cookie: await authCookie(recipient._id)},
            body: {},
        });
        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const emailBody = JSON.parse(fetchCall[1].body);
        expect(emailBody.HtmlBody).toContain('Not provided');
        expect(emailBody.HtmlBody).toContain('None');
    });

    it('sends contact info only to the giver from the most recent exchange', async () => {
        const recipient = makeUser({name: 'Whitney', email: 'recipient@test.com'});
        const oldGiver = makeUser({name: 'OldAlex', email: 'old-giver@test.com'});
        const newGiver = makeUser({name: 'NewAlex', email: 'new-giver@test.com'});

        await db.collection('users').insertMany([recipient, oldGiver, newGiver]);
        await db.collection('exchanges').insertMany([
            makeExchange({
                participants: [oldGiver._id, recipient._id],
                assignments: [{giverId: oldGiver._id, recipientId: recipient._id}],
                createdAt: new Date('2025-01-01'),
            }),
            makeExchange({
                participants: [newGiver._id, recipient._id],
                assignments: [{giverId: newGiver._id, recipientId: recipient._id}],
                createdAt: new Date('2026-01-01'),
            }),
        ]);

        const event = buildEvent('POST', {
            headers: {cookie: await authCookie(recipient._id)},
            body: {
                address: '123 Main St',
                phone: '555-1234',
                notes: 'Front door',
            },
        });

        await handler(event);

        expect(mockFetch).toHaveBeenCalledTimes(1);
        const emailBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(emailBody.To).toBe('new-giver@test.com');
    });
});
