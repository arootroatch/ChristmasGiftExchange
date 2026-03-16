import {describe, expect, it, vi, beforeAll, beforeEach, afterAll} from 'vitest';

describe('sendEmailsWithRetry', () => {
    let sendEmailsWithRetry;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret';
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
        delete process.env.NETLIFY_EMAILS_SECRET;
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
        const result = await sendEmailsWithRetry(participants, assignments, userByEmail);
        expect(result.emailsFailed).toEqual([]);
    });

    it('retries failed emails up to 3 times', async () => {
        fetch
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce({ok: true})
            .mockResolvedValue({ok: true});

        const result = await sendEmailsWithRetry(participants, assignments, userByEmail);
        expect(result.emailsFailed).toEqual([]);
    });

    it('adds email to emailsFailed after 3 failures', async () => {
        fetch
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValue({ok: true});

        const result = await sendEmailsWithRetry(participants, assignments, userByEmail);
        expect(result.emailsFailed).toEqual(['alex@test.com']);
    });

    it('sends correct email parameters', async () => {
        fetch.mockResolvedValue({ok: true});
        await sendEmailsWithRetry(participants, assignments, userByEmail);

        const calls = fetch.mock.calls;
        const alexBody = JSON.parse(calls.find(c => {
            const b = JSON.parse(c[1].body);
            return b.parameters?.name === 'Alex';
        })[1].body);

        expect(alexBody.to).toBe('alex@test.com');
        expect(alexBody.parameters.recipient).toBe('Whitney');
        expect(alexBody.parameters.wishlistEditUrl).toBe('https://test.netlify.app/wishlist/edit/alex-token');
    });

    it('sets wishlistEditUrl to null when user not in userByEmail', async () => {
        fetch.mockResolvedValue({ok: true});
        await sendEmailsWithRetry(participants, assignments, {});

        const calls = fetch.mock.calls;
        const body = JSON.parse(calls[0][1].body);
        expect(body.parameters.wishlistEditUrl).toBeNull();
    });
});

describe('sendNotificationEmail', () => {
    let sendNotificationEmail, setRequestOrigin;

    beforeAll(async () => {
        process.env.CONTEXT = 'production';
        process.env.URL = 'https://production.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret';
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
        delete process.env.URL;
        delete process.env.NETLIFY_EMAILS_SECRET;
    });

    it('always uses process.env.URL for email function calls', async () => {
        setRequestOrigin({rawUrl: 'https://deploy-preview-42--mysite.netlify.app/.netlify/functions/api-exchange-post'});

        await sendNotificationEmail('secret-santa', 'user@test.com', 'Subject', {});

        expect(fetch).toHaveBeenCalledWith(
            'https://production.netlify.app/.netlify/functions/emails/secret-santa',
            expect.any(Object)
        );
    });
});
