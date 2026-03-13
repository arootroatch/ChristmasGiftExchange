import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';

describe('api-results-email-post', () => {
    let handler;
    const originalContext = process.env.CONTEXT;

    beforeAll(async () => {
        process.env.CONTEXT = 'dev';
        const module = await import('../../netlify/functions/api-results-email-post.mjs');
        handler = module.handler;
    });

    afterAll(() => {
        if (originalContext === undefined) delete process.env.CONTEXT;
        else process.env.CONTEXT = originalContext;
    });

    function buildEvent(body) {
        return {
            httpMethod: 'POST',
            body: JSON.stringify(body),
        };
    }

    const validPayload = {
        name: 'Alex',
        email: 'alex@test.com',
        assignments: [
            {giver: 'Alex', recipient: 'Whitney'},
            {giver: 'Whitney', recipient: 'Alex'},
        ],
    };

    it('returns 405 for non-POST requests', async () => {
        const event = {httpMethod: 'GET', body: '{}'};
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 for missing required fields', async () => {
        const event = buildEvent({name: 'Alex'});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for invalid email', async () => {
        const event = buildEvent({...validPayload, email: 'not-an-email'});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for empty assignments', async () => {
        const event = buildEvent({...validPayload, assignments: []});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('sends email with correct template and parameters', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const event = buildEvent(validPayload);
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('results-summary')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('alex@test.com')
        );
        consoleSpy.mockRestore();
    });
});
