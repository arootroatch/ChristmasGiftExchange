import {describe, expect, it, vi, beforeAll, beforeEach, afterAll} from 'vitest';
import {defmulti} from '../../../netlify/shared/multimethod.mjs';

describe('postmark email provider', () => {
    let sendNotificationEmail, sendBatchNotificationEmails;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        vi.stubGlobal('fetch', vi.fn());

        sendNotificationEmail = defmulti(() => 'production');
        sendBatchNotificationEmails = defmulti(() => 'production');

        vi.doMock('../../../netlify/shared/giverNotification.mjs', () => ({
            sendNotificationEmail,
            sendBatchNotificationEmails,
        }));

        await import('../../../netlify/shared/emailProviders/postmark.mjs');
    });

    afterAll(() => {
        vi.unstubAllGlobals();
        delete process.env.CONTEXT;
        delete process.env.POSTMARK_SERVER_TOKEN;
    });

    describe('sendNotificationEmail', () => {
        beforeEach(() => {
            fetch.mockReset();
            fetch.mockResolvedValue({ok: true});
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

        it('throws for unknown template name', async () => {
            await expect(
                sendNotificationEmail('nonexistent', 'a@b.com', 'Subject', {})
            ).rejects.toThrow('Unknown email template: nonexistent');
        });
    });

    describe('sendBatchNotificationEmails', () => {
        beforeEach(() => {
            fetch.mockReset();
        });

        const messages = [
            {
                to: 'alex@test.com', templateName: 'secret-santa',
                subject: 'Your recipient!',
                parameters: {name: 'Alex', recipient: 'Whitney', wishlistEditUrl: null, wishlistViewUrl: null},
            },
            {
                to: 'whitney@test.com', templateName: 'secret-santa',
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
});
