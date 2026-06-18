import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from '../shared/testData.js';
import {buildEvent} from '../shared/specHelper.js';
import {generateAndStoreCode} from '../../netlify/shared/authCodes.mjs';

vi.mock('../../netlify/shared/logger.mjs');
import {logger} from '../../netlify/shared/logger.mjs';

describe('api-auth-verify-post', () => {
    let db, handler, mongo, mockFetch;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);

        process.env.URL = 'https://test.netlify.app';
        process.env.JWT_SECRET = 'test-secret';

        mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve([]),
        });
        vi.stubGlobal('fetch', mockFetch);

        const module = await import('../../netlify/functions/api-auth-verify-post.mjs');
        handler = module.handler;
    });

    beforeEach(() => {
        mockFetch.mockClear();
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'authCodes', 'rateLimits');
    });

    afterAll(async () => {
        vi.unstubAllGlobals();
        delete process.env.URL;
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    it('returns 405 for non-POST requests', async () => {
        const event = buildEvent('GET');
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it('returns 400 for missing email', async () => {
        const event = buildEvent('POST', {body: {code: '12345678'}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for missing code', async () => {
        const event = buildEvent('POST', {body: {email: 'test@test.com'}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 401 for invalid code', async () => {
        const user = makeUser({email: 'test@test.com'});
        await seedUsers(db, user);
        await generateAndStoreCode('test@test.com');

        const event = buildEvent('POST', {body: {email: 'test@test.com', code: '00000000'}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('returns 401 when user not found and no name provided', async () => {
        const code = await generateAndStoreCode('newuser@test.com');

        const event = buildEvent('POST', {body: {email: 'newuser@test.com', code}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it('creates new user when name provided and user does not exist', async () => {
        const code = await generateAndStoreCode('newuser@test.com');

        const event = buildEvent('POST', {body: {email: 'newuser@test.com', code, name: 'New User'}});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const user = await db.collection('users').findOne({email: 'newuser@test.com'});
        expect(user).not.toBeNull();
        expect(user.name).toBe('New User');
        expect(user.email).toBe('newuser@test.com');
        expect(user.wishlists).toEqual([]);
        expect(user.wishItems).toEqual([]);
    });

    it('updates name for existing user when name provided', async () => {
        const user = makeUser({email: 'existing@test.com', name: 'Old Name'});
        await seedUsers(db, user);
        const code = await generateAndStoreCode('existing@test.com');

        const event = buildEvent('POST', {body: {email: 'existing@test.com', code, name: 'New Name'}});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const updated = await db.collection('users').findOne({email: 'existing@test.com'});
        expect(updated.name).toBe('New Name');
    });

    it('sets httpOnly cookie with JWT on success', async () => {
        const user = makeUser({email: 'test@test.com'});
        await seedUsers(db, user);
        const code = await generateAndStoreCode('test@test.com');

        const event = buildEvent('POST', {body: {email: 'test@test.com', code}});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const cookie = response.headers['Set-Cookie'];
        expect(cookie).toBeDefined();
        expect(cookie).toContain('session=');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('Secure');
        expect(cookie).toContain('SameSite=Strict');
    });

    it('returns {success: true} on success', async () => {
        const user = makeUser({email: 'test@test.com'});
        await seedUsers(db, user);
        const code = await generateAndStoreCode('test@test.com');

        const event = buildEvent('POST', {body: {email: 'test@test.com', code}});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
    });

    it('logs warn when login fails with invalid code', async () => {
        const user = makeUser({email: 'test@test.com'});
        await seedUsers(db, user);
        await generateAndStoreCode('test@test.com');
        await handler(buildEvent('POST', {body: {email: 'test@test.com', code: '00000000'}}));
        expect(vi.mocked(logger.warn)).toHaveBeenCalledWith('Login failed - invalid code', expect.objectContaining({email: 'test@test.com'}));
    });

    it('logs info on successful login for existing user', async () => {
        const user = makeUser({email: 'test@test.com'});
        await seedUsers(db, user);
        const code = await generateAndStoreCode('test@test.com');
        await handler(buildEvent('POST', {body: {email: 'test@test.com', code}}));
        expect(vi.mocked(logger.info)).toHaveBeenCalledWith('Login success', expect.objectContaining({email: 'test@test.com'}));
    });

    it('logs info when new user is created on verify', async () => {
        const code = await generateAndStoreCode('new@test.com');
        await db.collection('users').insertOne({email: 'new@test.com', name: 'New User', wishlists: [], wishItems: []});
        const code2 = await generateAndStoreCode('newuser@test.com');
        await db.collection('users').insertOne({email: 'newuser@test.com', wishlists: [], wishItems: []});
        const realCode = await generateAndStoreCode('brand@test.com');
        await handler(buildEvent('POST', {body: {email: 'brand@test.com', code: realCode, name: 'Brand New'}}));
        expect(vi.mocked(logger.info)).toHaveBeenCalledWith('New user created', expect.objectContaining({email: 'brand@test.com'}));
    });

    it('deletes code after successful verification', async () => {
        const user = makeUser({email: 'test@test.com'});
        await seedUsers(db, user);
        const code = await generateAndStoreCode('test@test.com');

        const event = buildEvent('POST', {body: {email: 'test@test.com', code}});
        await handler(event);

        const authCode = await db.collection('authCodes').findOne({email: 'test@test.com'});
        expect(authCode).toBeNull();
    });
});
