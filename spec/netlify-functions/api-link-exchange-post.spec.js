import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from '../shared/testData.js';
import {authCookie, buildEvent} from '../shared/specHelper.js';

vi.mock('../../netlify/shared/logger.mjs');
import {logger} from '../../netlify/shared/logger.mjs';

describe('api-link-exchange-post', () => {
    let db, handler, mongo;
    const postPath = '/.netlify/functions/api-link-exchange-post';

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.URL = 'https://test.netlify.app';
        process.env.JWT_SECRET = 'test-secret';
        const module = await import('../../netlify/functions/api-link-exchange-post.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'linkExchanges', 'rateLimits');
    });

    afterAll(async () => {
        delete process.env.URL;
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    const payload = {
        exchangeId: 'link-exchange-123',
        houses: [{id: 'house1', name: 'Group 1', members: ['Alex', 'Whitney']}],
        participants: [
            {name: 'Alex', recipient: 'Whitney'},
            {name: 'Whitney', recipient: 'Alex'},
        ],
    };

    it('returns 405 for non-POST requests', async () => {
        const response = await handler(buildEvent('GET', {path: postPath}));
        expect(response.statusCode).toBe(405);
    });

    it('creates the exchange with hasDrawn false for every participant, no auth required', async () => {
        const event = buildEvent('POST', {body: payload, path: postPath});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).exchangeId).toBe('link-exchange-123');

        const doc = await db.collection('linkExchanges').findOne({exchangeId: 'link-exchange-123'});
        expect(doc.participants).toHaveLength(2);
        expect(doc.participants.every(p => p.hasDrawn === false)).toBe(true);
        expect(doc.participants.find(p => p.name === 'Alex').recipient).toBe('Whitney');
        expect(doc.houses).toEqual([{name: 'Group 1', members: ['Alex', 'Whitney']}]);
        expect(doc.organizer).toBeUndefined();
    });

    it('attaches organizer when a valid session cookie is present', async () => {
        const organizer = makeUser({email: 'organizer@test.com'});
        await seedUsers(db, organizer);
        const cookie = await authCookie(organizer._id);

        const event = buildEvent('POST', {body: payload, path: postPath, headers: {cookie}});
        await handler(event);

        const doc = await db.collection('linkExchanges').findOne({exchangeId: 'link-exchange-123'});
        expect(doc.organizer.equals(organizer._id)).toBe(true);
    });

    it('rejects duplicate participant names', async () => {
        const event = buildEvent('POST', {
            body: {...payload, participants: [{name: 'Alex', recipient: 'Alex'}, {name: 'Alex', recipient: 'Alex'}]},
            path: postPath,
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('rejects a recipient that does not match any participant name', async () => {
        const event = buildEvent('POST', {
            body: {...payload, participants: [{name: 'Alex', recipient: 'Ghost'}, {name: 'Whitney', recipient: 'Alex'}]},
            path: postPath,
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 for missing required fields', async () => {
        const event = buildEvent('POST', {body: {houses: []}, path: postPath});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it('logs info when a link exchange is created', async () => {
        await handler(buildEvent('POST', {body: payload, path: postPath}));
        expect(vi.mocked(logger.info)).toHaveBeenCalledWith('Link exchange created', expect.objectContaining({exchangeId: 'link-exchange-123', participantCount: 2}));
    });
});
