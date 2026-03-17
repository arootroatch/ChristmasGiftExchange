import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import crypto from 'crypto';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-giver-notify-post', () => {
    let client, db, handler;
    let mongo;
    let mockFetch;

    const alexToken = crypto.randomUUID();
    const whitneyToken = crypto.randomUUID();
    const hunterToken = crypto.randomUUID();

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);

        process.env.URL = 'https://test.netlify.app';
        process.env.POSTMARK_SERVER_TOKEN = 'test-postmark-token';
        process.env.CONTEXT = 'production';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-giver-notify-post.mjs');
        handler = module.handler;
    });

    beforeEach(async () => {
        mockFetch.mockClear();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        await db.collection('users').insertMany([
            {name: 'Alex', email: 'alex@test.com', token: alexToken, wishlists: [], wishItems: []},
            {name: 'Whitney', email: 'whitney@test.com', token: whitneyToken, wishlists: [], wishItems: []},
            {name: 'Hunter', email: 'hunter@test.com', token: hunterToken, wishlists: [], wishItems: []},
        ]);
    });

    afterEach(async () => {
        await cleanCollections(db, 'users');
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.URL;
        delete process.env.POSTMARK_SERVER_TOKEN;
        delete process.env.CONTEXT;
        await teardownMongo(mongo);
    });

    function buildEvent(body) {
        return {
            httpMethod: 'POST',
            body: JSON.stringify(body),
        };
    }

    const bulkPayload = {
        exchangeId: 'test-exchange-id',
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

        const alexEmail = bodies.find(b => b.To === 'alex@test.com');
        expect(alexEmail.HtmlBody).toContain('Whitney');
        expect(alexEmail.HtmlBody).toContain(
            `https://test.netlify.app/wishlist/edit/${alexToken}`
        );
    });

    it('builds wishlistEditUrl from DB token and process.env.URL', async () => {
        const event = buildEvent(bulkPayload);
        await handler(event);

        const calls = mockFetch.mock.calls;
        const bodies = calls.map(c => JSON.parse(c[1].body));

        bodies.forEach(body => {
            const tokenMap = {Alex: alexToken, Whitney: whitneyToken, Hunter: hunterToken};
            const matchedName = Object.keys(tokenMap).find(name =>
                body.HtmlBody.includes(`Greetings, ${name}`)
            );
            expect(body.HtmlBody).toContain(
                `https://test.netlify.app/wishlist/edit/${tokenMap[matchedName]}`
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
            .mockResolvedValueOnce({ok: true})   // Alex: attempt 1 succeeds
            .mockRejectedValueOnce(new Error('fail'))  // Whitney: attempt 1 fails
            .mockRejectedValueOnce(new Error('fail'))  // Whitney: attempt 2 fails
            .mockRejectedValueOnce(new Error('fail'))  // Whitney: attempt 3 fails
            .mockResolvedValueOnce({ok: true})   // Hunter: attempt 1 succeeds
            .mockResolvedValueOnce({ok: true});  // error-alert email

        const event = buildEvent(bulkPayload);
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.sent).toBe(2);
        expect(body.total).toBe(3);
        expect(body.emailsFailed).toEqual(['whitney@test.com']);
    });

    it('returns emailsFailed array with failed emails', async () => {
        mockFetch
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce({ok: true})
            .mockResolvedValueOnce({ok: true})
            .mockResolvedValueOnce({ok: true}); // error-alert email

        const event = buildEvent(bulkPayload);
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.emailsFailed).toContain('alex@test.com');
        expect(body.emailsFailed).toHaveLength(1);
    });

    it('sends error-alert email to admin when emails fail after retries', async () => {
        mockFetch
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce({ok: true})
            .mockResolvedValueOnce({ok: true})
            .mockResolvedValueOnce({ok: true});

        const event = buildEvent(bulkPayload);
        await handler(event);

        const calls = mockFetch.mock.calls;
        const errorAlertCall = calls.find(c => {
            const body = JSON.parse(c[1].body);
            return body.HtmlBody && body.HtmlBody.includes('Server Error');
        });
        expect(errorAlertCall).toBeDefined();
        const alertBody = JSON.parse(errorAlertCall[1].body);
        expect(alertBody.HtmlBody).toContain('api-giver-notify-post');
        expect(alertBody.HtmlBody).toContain('alex@test.com');
    });

    it('counts emails that return non-OK response as failures', async () => {
        const failResponse = {ok: false, status: 500, text: () => Promise.resolve('Server Error')};
        mockFetch
            .mockResolvedValueOnce({ok: true})
            .mockResolvedValueOnce(failResponse)
            .mockResolvedValueOnce(failResponse)
            .mockResolvedValueOnce(failResponse)
            .mockResolvedValueOnce({ok: true})
            .mockResolvedValueOnce({ok: true}); // error-alert email

        const event = buildEvent(bulkPayload);
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.sent).toBe(2);
        expect(body.total).toBe(3);
    });

    it('omits wishlist CTA when user not found in DB', async () => {
        await db.collection('users').deleteOne({email: 'alex@test.com'});

        const event = buildEvent(bulkPayload);
        await handler(event);

        const calls = mockFetch.mock.calls;
        const bodies = calls.map(c => JSON.parse(c[1].body));
        const alexEmail = bodies.find(b => b.HtmlBody && b.HtmlBody.includes('Greetings, Alex'));
        expect(alexEmail.HtmlBody).not.toContain('Add Your Wishlist');
    });

    it('handles names with special characters', async () => {

        await db.collection('users').insertOne({
            name: "O'Brien", email: 'obrien@test.com', token: crypto.randomUUID(), wishlists: [], wishItems: [],
        });

        const event = buildEvent({
            exchangeId: 'test-exchange-id',
            participants: [{name: "O'Brien", email: 'obrien@test.com'}],
            assignments: [{giver: "O'Brien", recipient: 'Whitney'}],
        });

        await handler(event);

        const call = mockFetch.mock.calls[0];
        const body = JSON.parse(call[1].body);
        expect(body.HtmlBody).toContain('O&#39;Brien');
    });
});
