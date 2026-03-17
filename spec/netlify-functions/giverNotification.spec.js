import {describe, expect, it, vi, beforeAll, beforeEach, afterAll} from 'vitest';

describe('sendEmailsWithRetry', () => {
    let sendEmailsWithRetry;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        vi.stubGlobal('fetch', vi.fn());
        const module = await import('../../netlify/shared/giverNotification.mjs');
        sendEmailsWithRetry = module.sendEmailsWithRetry;
    });

    beforeEach(() => {
        fetch.mockReset();
        vi.spyOn(console, 'error').mockImplementation(() => {});
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

    it('returns empty emailsFailed when all emails succeed', async () => {
        fetch.mockResolvedValue({ok: true});
        const result = await sendEmailsWithRetry(participants, assignments, userByEmail, 'exchange-123');
        expect(result.emailsFailed).toEqual([]);
    });

    it('retries failed emails up to 3 times', async () => {
        fetch
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce({ok: true})
            .mockResolvedValue({ok: true});

        const result = await sendEmailsWithRetry(participants, assignments, userByEmail, 'exchange-123');
        expect(result.emailsFailed).toEqual([]);
    });

    it('adds email to emailsFailed after 3 failures', async () => {
        fetch
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValue({ok: true});

        const result = await sendEmailsWithRetry(participants, assignments, userByEmail, 'exchange-123');
        expect(result.emailsFailed).toEqual(['alex@test.com']);
    });

    it('sends correct email parameters', async () => {
        fetch.mockResolvedValue({ok: true});
        await sendEmailsWithRetry(participants, assignments, userByEmail, 'exchange-123');

        const calls = fetch.mock.calls;
        expect(calls).toHaveLength(2);

        const alexCall = calls.find(c => {
            const b = JSON.parse(c[1].body);
            return b.To === 'alex@test.com';
        });

        const body = JSON.parse(alexCall[1].body);
        expect(body.To).toBe('alex@test.com');
        expect(body.HtmlBody).toContain('Alex');
        expect(body.HtmlBody).toContain('Whitney');
        expect(body.HtmlBody).toContain('https://test.netlify.app/wishlist/edit/alex-token');
        expect(body.HtmlBody).toContain('https://test.netlify.app/wishlist/view/alex-token?exchange=exchange-123');
    });

    it('omits wishlist CTA when user not in userByEmail', async () => {
        fetch.mockResolvedValue({ok: true});
        await sendEmailsWithRetry(participants, assignments, {}, 'exchange-123');

        const body = JSON.parse(fetch.mock.calls[0][1].body);
        expect(body.HtmlBody).not.toContain('Add Your Wishlist');
        expect(body.HtmlBody).not.toContain("Wish List");
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
