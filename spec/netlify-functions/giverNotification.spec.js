import {describe, expect, it, vi, beforeAll, beforeEach, afterAll, afterEach} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';
import {ObjectId} from 'mongodb';

describe('forEachGiverOf', () => {
    let forEachGiverOf, mongo, db;

    beforeAll(async () => {
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/shared/giverNotification.mjs');
        forEachGiverOf = module.forEachGiverOf;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges');
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it('calls callback with giver from most recent exchange only', async () => {
        const recipientId = new ObjectId();
        const oldGiverId = new ObjectId();
        const newGiverId = new ObjectId();

        await db.collection('users').insertMany([
            {_id: recipientId, name: 'Bob', email: 'bob@test.com', token: 'bob-token', wishlists: [], wishItems: []},
            {_id: oldGiverId, name: 'OldAlice', email: 'old@test.com', token: 'old-token', wishlists: [], wishItems: []},
            {_id: newGiverId, name: 'NewAlice', email: 'new@test.com', token: 'new-token', wishlists: [], wishItems: []},
        ]);

        await db.collection('exchanges').insertMany([
            {
                exchangeId: 'old-exchange',
                createdAt: new Date('2025-01-01'),
                isSecretSanta: true,
                participants: [oldGiverId, recipientId],
                assignments: [{giverId: oldGiverId, recipientId}],
                houses: [],
            },
            {
                exchangeId: 'new-exchange',
                createdAt: new Date('2026-01-01'),
                isSecretSanta: true,
                participants: [newGiverId, recipientId],
                assignments: [{giverId: newGiverId, recipientId}],
                houses: [],
            },
        ]);

        const calls = [];
        await forEachGiverOf({_id: recipientId}, ({giver, exchange}) => {
            calls.push({giverName: giver.name, exchangeId: exchange.exchangeId});
        });

        expect(calls).toHaveLength(1);
        expect(calls[0].giverName).toBe('NewAlice');
        expect(calls[0].exchangeId).toBe('new-exchange');
    });

    it('does nothing when user has no exchanges', async () => {
        const recipientId = new ObjectId();
        const calls = [];
        await forEachGiverOf({_id: recipientId}, ({giver}) => {
            calls.push(giver);
        });
        expect(calls).toHaveLength(0);
    });
});

describe('sendBatchEmails', () => {
    let sendBatchEmails;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        vi.stubGlobal('fetch', vi.fn());
        const module = await import('../../netlify/shared/giverNotification.mjs');
        sendBatchEmails = module.sendBatchEmails;
    });

    beforeEach(() => {
        fetch.mockReset();
    });

    afterAll(() => {
        vi.unstubAllGlobals();
        delete process.env.CONTEXT;
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
    });

    const participants = [
        {name: 'Alex', email: 'alex@test.com'},
        {name: 'Whitney', email: 'whitney@test.com'},
    ];
    const assignments = [{giver: 'Alex', recipient: 'Whitney'}, {giver: 'Whitney', recipient: 'Alex'}];
    const userByEmail = {
        'alex@test.com': {token: 'alex-token'},
        'whitney@test.com': {token: 'whitney-token'},
    };

    function mockBatchSuccess(emails) {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(emails.map(e => ({ErrorCode: 0, To: e}))),
        });
    }

    it('sends single POST to /email/batch', async () => {
        mockBatchSuccess(['alex@test.com', 'whitney@test.com']);
        await sendBatchEmails(participants, assignments, userByEmail, 'exchange-123');

        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch.mock.calls[0][0]).toBe('https://api.postmarkapp.com/email/batch');
    });

    it('returns empty emailsFailed when all succeed', async () => {
        mockBatchSuccess(['alex@test.com', 'whitney@test.com']);
        const result = await sendBatchEmails(participants, assignments, userByEmail, 'exchange-123');
        expect(result.emailsFailed).toEqual([]);
    });

    it('returns failed emails from Postmark per-message status', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                {ErrorCode: 0, To: 'alex@test.com'},
                {ErrorCode: 406, To: 'whitney@test.com', Message: 'Inactive'},
            ]),
        });

        const result = await sendBatchEmails(participants, assignments, userByEmail, 'exchange-123');
        expect(result.emailsFailed).toEqual(['whitney@test.com']);
    });

    it('sends correct email content with wishlist URLs', async () => {
        mockBatchSuccess(['alex@test.com', 'whitney@test.com']);
        await sendBatchEmails(participants, assignments, userByEmail, 'exchange-123');

        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body).toHaveLength(2);

        const alexMsg = body.find(m => m.To === 'alex@test.com');
        expect(alexMsg.HtmlBody).toContain('Alex');
        expect(alexMsg.HtmlBody).toContain('Whitney');
        expect(alexMsg.HtmlBody).toContain('https://test.netlify.app/wishlist/edit/alex-token');
        expect(alexMsg.HtmlBody).toContain('https://test.netlify.app/wishlist/view/alex-token?exchange=exchange-123');
    });

    it('omits wishlist CTA when user not in userByEmail', async () => {
        mockBatchSuccess(['alex@test.com', 'whitney@test.com']);
        await sendBatchEmails(participants, assignments, {}, 'exchange-123');

        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body[0].HtmlBody).not.toContain('Add Your Wishlist');
        expect(body[0].HtmlBody).not.toContain("Wish List");
    });
});

describe('sendNotificationEmail', () => {
    let sendNotificationEmail, setRequestOrigin;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        vi.stubGlobal('fetch', vi.fn());
        const module = await import('../../netlify/shared/giverNotification.mjs');
        sendNotificationEmail = module.sendNotificationEmail;
        setRequestOrigin = module.setRequestOrigin;
    });

    beforeEach(() => {
        fetch.mockReset();
        fetch.mockResolvedValue({ok: true});
        setRequestOrigin(null);
    });

    afterAll(() => {
        vi.unstubAllGlobals();
        delete process.env.CONTEXT;
        delete process.env.POSTMARK_SERVER_TOKEN;
    });

    it('sends to Postmark API with correct headers and body', async () => {
        await sendNotificationEmail('secret-santa', 'user@test.com', 'Subject', {
            name: 'Alex', recipient: 'Whitney', wishlistEditUrl: null, wishlistViewUrl: null,
        });

        expect(fetch).toHaveBeenCalledTimes(1);
        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe('https://api.postmarkapp.com/email');
        expect(options.headers['X-Postmark-Server-Token']).toBe('test-postmark-token');
        expect(options.headers['Content-Type']).toBe('application/json');

        const body = JSON.parse(options.body);
        expect(body.From).toBe('alex@soundrootsproductions.com');
        expect(body.To).toBe('user@test.com');
        expect(body.Subject).toBe('Subject');
        expect(body.HtmlBody).toContain('Alex');
        expect(body.HtmlBody).toContain('Whitney');
    });

    it('throws with Postmark response body on failure', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 422,
            text: () => Promise.resolve('{"ErrorCode":300,"Message":"Invalid email"}'),
        });

        await expect(
            sendNotificationEmail('secret-santa', 'bad@test.com', 'Subject', {
                name: 'A', recipient: 'B', wishlistEditUrl: null, wishlistViewUrl: null,
            })
        ).rejects.toThrow('Email send failed (422)');
    });
});

describe('sendBatchNotificationEmails', () => {
    let sendBatchNotificationEmails;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        vi.stubGlobal('fetch', vi.fn());
        const module = await import('../../netlify/shared/giverNotification.mjs');
        sendBatchNotificationEmails = module.sendBatchNotificationEmails;
    });

    beforeEach(() => {
        fetch.mockReset();
    });

    afterAll(() => {
        vi.unstubAllGlobals();
        delete process.env.CONTEXT;
        delete process.env.POSTMARK_SERVER_TOKEN;
    });

    const messages = [
        {
            to: 'alex@test.com',
            templateName: 'secret-santa',
            subject: 'Your recipient!',
            parameters: {name: 'Alex', recipient: 'Whitney', wishlistEditUrl: null, wishlistViewUrl: null},
        },
        {
            to: 'whitney@test.com',
            templateName: 'secret-santa',
            subject: 'Your recipient!',
            parameters: {name: 'Whitney', recipient: 'Alex', wishlistEditUrl: null, wishlistViewUrl: null},
        },
    ];

    it('sends single POST to /email/batch with array of messages', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                {ErrorCode: 0, To: 'alex@test.com', MessageID: 'abc'},
                {ErrorCode: 0, To: 'whitney@test.com', MessageID: 'def'},
            ]),
        });

        const result = await sendBatchNotificationEmails(messages);

        expect(fetch).toHaveBeenCalledTimes(1);
        const [url, options] = fetch.mock.calls[0];
        expect(url).toBe('https://api.postmarkapp.com/email/batch');
        expect(options.headers['X-Postmark-Server-Token']).toBe('test-postmark-token');

        const body = JSON.parse(options.body);
        expect(body).toHaveLength(2);
        expect(body[0].From).toBe('alex@soundrootsproductions.com');
        expect(body[0].To).toBe('alex@test.com');
        expect(body[0].HtmlBody).toContain('Alex');
        expect(body[1].To).toBe('whitney@test.com');
    });

    it('returns empty emailsFailed when all succeed', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                {ErrorCode: 0, To: 'alex@test.com'},
                {ErrorCode: 0, To: 'whitney@test.com'},
            ]),
        });

        const result = await sendBatchNotificationEmails(messages);
        expect(result.emailsFailed).toEqual([]);
    });

    it('returns failed emails when some have non-zero ErrorCode', async () => {
        fetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve([
                {ErrorCode: 0, To: 'alex@test.com'},
                {ErrorCode: 406, To: 'whitney@test.com', Message: 'Inactive recipient'},
            ]),
        });

        const result = await sendBatchNotificationEmails(messages);
        expect(result.emailsFailed).toEqual(['whitney@test.com']);
    });

    it('throws when Postmark returns non-OK HTTP response', async () => {
        fetch.mockResolvedValueOnce({
            ok: false,
            status: 500,
            text: () => Promise.resolve('Internal Server Error'),
        });

        await expect(sendBatchNotificationEmails(messages))
            .rejects.toThrow('Batch email send failed (500)');
    });
});
