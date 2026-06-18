import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from '../shared/testData.js';
import {buildEvent} from '../shared/specHelper.js';
import {generateAndStoreCode} from '../../netlify/shared/authCodes.mjs';

vi.mock("../../netlify/shared/logger.mjs");

describe('api-admin-verify-post', () => {
    let db, handler, mongo;

    const adminUser = makeUser({email: 'admin@example.com'});

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = 'test-secret';
        process.env.ADMIN_EMAIL = 'admin@example.com';

        const mod = await import('../../netlify/functions/api-admin-verify-post.mjs');
        handler = mod.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'authCodes', 'rateLimits', 'logs');
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        delete process.env.ADMIN_EMAIL;
        await teardownMongo(mongo);
    });

    it('returns 405 for non-POST requests', async () => {
        const response = await handler(buildEvent('GET'));
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 for missing code', async () => {
        const response = await handler(buildEvent('POST', {body: {}}));
        expect(response.statusCode).toBe(400);
    });

    it('returns 401 for wrong code', async () => {
        await seedUsers(db, adminUser);
        await generateAndStoreCode('admin@example.com');
        const response = await handler(buildEvent('POST', {body: {code: '00000000'}}));
        expect(response.statusCode).toBe(401);
    });

    it('returns 200 and sets session cookie for correct code', async () => {
        await seedUsers(db, adminUser);
        const code = await generateAndStoreCode('admin@example.com');
        const response = await handler(buildEvent('POST', {body: {code}}));
        expect(response.statusCode).toBe(200);
        expect(response.headers['Set-Cookie']).toMatch(/session=/);
    });

    it('returns 200 and creates admin user if not yet in database', async () => {
        const code = await generateAndStoreCode('admin@example.com');
        const response = await handler(buildEvent('POST', {body: {code}}));
        expect(response.statusCode).toBe(200);
        expect(response.headers['Set-Cookie']).toMatch(/session=/);
        const created = await db.collection('users').findOne({email: 'admin@example.com'});
        expect(created).not.toBeNull();
        expect(created.name).toBe('Admin');
    });

    it('returns 429 when rate limit exceeded', async () => {
        await seedUsers(db, adminUser);
        for (let i = 0; i < 5; i++) {
            await handler(buildEvent('POST', {body: {code: '00000000'}}));
        }
        const response = await handler(buildEvent('POST', {body: {code: '00000000'}}));
        expect(response.statusCode).toBe(429);
    });
});
