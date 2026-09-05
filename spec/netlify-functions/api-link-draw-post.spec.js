import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {buildEvent} from '../shared/specHelper.js';

describe('api-link-draw-post', () => {
    let db, handler, mongo;
    const drawPath = '/.netlify/functions/api-link-draw-post';
    const validExchangeId = '93c4172a-0c0c-4f0c-81af-89382d56817e';
    const otherValidExchangeId = '55eacc44-5530-4d2b-92b7-19c375e70903';

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.URL = 'https://test.netlify.app';
        const module = await import('../../netlify/functions/api-link-draw-post.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, 'linkExchanges');
    });

    afterAll(async () => {
        delete process.env.URL;
        await teardownMongo(mongo);
    });

    async function seedLinkExchange() {
        await db.collection('linkExchanges').insertOne({
            exchangeId: validExchangeId,
            createdAt: new Date(),
            houses: [],
            participants: [
                {name: 'Alex', recipient: 'Whitney', hasDrawn: false},
                {name: 'Whitney', recipient: 'Alex', hasDrawn: false},
            ],
        });
    }

    it('returns the recipient and flips hasDrawn on first draw', async () => {
        await seedLinkExchange();
        const event = buildEvent('POST', {body: {exchangeId: validExchangeId, name: 'Alex'}, path: drawPath});
        const response = await handler(event);

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body).recipient).toBe('Whitney');

        const doc = await db.collection('linkExchanges').findOne({exchangeId: validExchangeId});
        expect(doc.participants.find(p => p.name === 'Alex').hasDrawn).toBe(true);
    });

    it('returns 409 when drawing the same name a second time', async () => {
        await seedLinkExchange();
        await handler(buildEvent('POST', {body: {exchangeId: validExchangeId, name: 'Alex'}, path: drawPath}));
        const response = await handler(buildEvent('POST', {body: {exchangeId: validExchangeId, name: 'Alex'}, path: drawPath}));

        expect(response.statusCode).toBe(409);
        expect(JSON.parse(response.body).error).toContain('Already viewed');
    });

    it('returns 404 for an unknown name', async () => {
        await seedLinkExchange();
        const response = await handler(buildEvent('POST', {body: {exchangeId: validExchangeId, name: 'Ghost'}, path: drawPath}));

        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body).error).toContain('not found');
    });

    it('returns 404 for an unknown exchangeId', async () => {
        const response = await handler(buildEvent('POST', {body: {exchangeId: otherValidExchangeId, name: 'Alex'}, path: drawPath}));
        expect(response.statusCode).toBe(404);
    });

    it('rejects a non-UUID exchangeId', async () => {
        const response = await handler(buildEvent('POST', {body: {exchangeId: 'nope', name: 'Alex'}, path: drawPath}));
        expect(response.statusCode).toBe(400);
    });

    it('returns 400 when the request body is missing a required field', async () => {
        const response = await handler(buildEvent('POST', {body: {exchangeId: validExchangeId}, path: drawPath}));
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toContain('name');
    });

    it('only one of two concurrent draws for the same name succeeds', async () => {
        await seedLinkExchange();
        const event = () => buildEvent('POST', {body: {exchangeId: validExchangeId, name: 'Alex'}, path: drawPath});
        const [first, second] = await Promise.all([handler(event()), handler(event())]);
        const statuses = [first.statusCode, second.statusCode].sort();

        expect(statuses).toEqual([200, 409]);
    });
});
