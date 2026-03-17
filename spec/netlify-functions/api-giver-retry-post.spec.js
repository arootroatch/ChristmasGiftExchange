import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import crypto from 'crypto';
import {setupMongo, teardownMongo, cleanCollections} from './mongoHelper.js';

describe('api-giver-retry-post', () => {
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

        mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-giver-retry-post.mjs');
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

    function mockBatchResponse(emails, failedEmails = []) {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(
                emails.map(e => ({
                    ErrorCode: failedEmails.includes(e) ? 406 : 0,
                    To: e,
                }))
            ),
        });
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

    it('sends batch email with correct parameters', async () => {
        mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);
        const event = buildEvent(bulkPayload);
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockFetch.mock.calls[0][0]).toBe('https://api.postmarkapp.com/email/batch');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body).toHaveLength(3);
        const alexMsg = body.find(m => m.To === 'alex@test.com');
        expect(alexMsg.HtmlBody).toContain('Whitney');
    });

    it('builds wishlistEditUrl from DB token and process.env.URL', async () => {
        mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);
        const event = buildEvent(bulkPayload);
        await handler(event);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        const tokenMap = {Alex: alexToken, Whitney: whitneyToken, Hunter: hunterToken};

        body.forEach(msg => {
            const matchedName = Object.keys(tokenMap).find(name =>
                msg.HtmlBody.includes(`Greetings, ${name}`)
            );
            expect(msg.HtmlBody).toContain(
                `https://test.netlify.app/wishlist/edit/${tokenMap[matchedName]}`
            );
        });
    });

    it('returns sent and total counts', async () => {
        mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);
        const event = buildEvent(bulkPayload);
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.sent).toBe(3);
        expect(body.total).toBe(3);
    });

    it('counts partial failures', async () => {
        mockBatchResponse(
            ['alex@test.com', 'whitney@test.com', 'hunter@test.com'],
            ['whitney@test.com']
        );
        mockFetch.mockResolvedValueOnce({ok: true}); // error-alert

        const event = buildEvent(bulkPayload);
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.sent).toBe(2);
        expect(body.total).toBe(3);
        expect(body.emailsFailed).toEqual(['whitney@test.com']);
    });

    it('returns emailsFailed array with failed emails', async () => {
        mockBatchResponse(
            ['alex@test.com', 'whitney@test.com', 'hunter@test.com'],
            ['alex@test.com']
        );
        mockFetch.mockResolvedValueOnce({ok: true}); // error-alert

        const event = buildEvent(bulkPayload);
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.emailsFailed).toContain('alex@test.com');
        expect(body.emailsFailed).toHaveLength(1);
    });

    it('sends error-alert email to admin when emails fail', async () => {
        mockBatchResponse(
            ['alex@test.com', 'whitney@test.com', 'hunter@test.com'],
            ['alex@test.com']
        );
        mockFetch.mockResolvedValueOnce({ok: true}); // error-alert

        const event = buildEvent(bulkPayload);
        await handler(event);

        expect(mockFetch).toHaveBeenCalledTimes(2);
        const errorAlertBody = JSON.parse(mockFetch.mock.calls[1][1].body);
        expect(errorAlertBody.HtmlBody).toContain('api-giver-retry-post');
        expect(errorAlertBody.HtmlBody).toContain('alex@test.com');
    });

    it('omits wishlist CTA when user not found in DB', async () => {
        await db.collection('users').deleteOne({email: 'alex@test.com'});
        mockBatchResponse(['alex@test.com', 'whitney@test.com', 'hunter@test.com']);

        const event = buildEvent(bulkPayload);
        await handler(event);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        const alexMsg = body.find(m => m.To === 'alex@test.com');
        expect(alexMsg.HtmlBody).not.toContain('Add Your Wishlist');
    });

    it('handles names with special characters', async () => {
        await db.collection('users').insertOne({
            name: "O'Brien", email: 'obrien@test.com', token: crypto.randomUUID(), wishlists: [], wishItems: [],
        });
        mockBatchResponse(["obrien@test.com"]);

        const event = buildEvent({
            exchangeId: 'test-exchange-id',
            participants: [{name: "O'Brien", email: 'obrien@test.com'}],
            assignments: [{giver: "O'Brien", recipient: 'Whitney'}],
        });

        await handler(event);

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body[0].HtmlBody).toContain('O&#39;Brien');
    });
});
