import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';

describe('api-giver-notify-post', () => {
    let handler;
    let mockFetch;
    let originalEnv;
    let consoleLogSpy;
    let consoleErrorSpy;

    beforeAll(async () => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        originalEnv = {...process.env};

        process.env.URL = 'https://test.netlify.app';
        process.env.NETLIFY_EMAILS_SECRET = 'test-secret-key';
        process.env.MONGO_DB_URI = 'mongodb://localhost:27017/test';

        mockFetch = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-giver-notify-post.mjs');
        handler = module.handler;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterAll(() => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
        vi.unstubAllGlobals();
        process.env = originalEnv;
    });

    function buildEvent(body) {
        return {
            httpMethod: 'POST',
            body: JSON.stringify(body),
        };
    }

    it('returns 405 for non-POST requests', async () => {
        const event = {httpMethod: 'GET', body: '{}'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 for missing required fields', async () => {
        const event = {
            httpMethod: 'POST',
            body: JSON.stringify({email: 'test@test.com'}),
        };
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.error).toContain('Missing required field');
    });

    it('sends email with correct parameters', async () => {
        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
        });

        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        const fetchCall = mockFetch.mock.calls[0];
        expect(fetchCall[0]).toBe('https://test.netlify.app/.netlify/functions/emails/secret-santa');
    });

    it('includes correct email details in request body', async () => {
        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
        });

        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);

        expect(requestBody).toEqual({
            from: 'alex@soundrootsproductions.com',
            to: 'alex@test.com',
            subject: 'Your gift exchange recipient name has arrived!',
            parameters: {
                name: 'Alex',
                recipient: 'Whitney',
                wishlistEditUrl: null,
            },
        });
    });

    it('returns 500 when fetch fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
        });

        const response = await handler(event);
        expect(response.statusCode).toBe(500);
        const body = JSON.parse(response.body);
        expect(body.error).toBe('Network error');
    });

    it('passes wishlistEditUrl when provided', async () => {
        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
            wishlistEditUrl: 'https://example.com/wishlist/edit/abc-123',
        });

        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody.parameters.wishlistEditUrl).toBe('https://example.com/wishlist/edit/abc-123');
    });

    it('defaults wishlistEditUrl to null when not provided', async () => {
        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
        });

        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody.parameters.wishlistEditUrl).toBeNull();
    });

    it('returns 400 for invalid email', async () => {
        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'not-an-email',
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid wishlistEditUrl', async () => {
        const event = buildEvent({
            name: 'Alex',
            recipient: 'Whitney',
            email: 'alex@test.com',
            wishlistEditUrl: 'not-a-url',
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('handles names with special characters', async () => {
        const event = buildEvent({
            name: "O'Brien",
            recipient: 'José García',
            email: 'obrien@test.com',
        });

        await handler(event);

        const fetchCall = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(fetchCall[1].body);
        expect(requestBody.parameters.name).toBe("O'Brien");
        expect(requestBody.parameters.recipient).toBe('José García');
    });
});
