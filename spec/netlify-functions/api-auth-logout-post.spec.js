import {describe, expect, it, beforeAll} from 'vitest';
import {buildEvent} from '../shared/testFactories.js';

describe('api-auth-logout-post', () => {
    let handler;

    beforeAll(async () => {
        const module = await import('../../netlify/functions/api-auth-logout-post.mjs');
        handler = module.handler;
    });

    it('returns 405 for non-POST requests', async () => {
        const event = buildEvent('GET');
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns {success: true} with Set-Cookie header containing Max-Age=0', async () => {
        const event = buildEvent('POST');
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);

        const cookie = response.headers['Set-Cookie'];
        expect(cookie).toBeDefined();
        expect(cookie).toContain('Max-Age=0');
    });
});
