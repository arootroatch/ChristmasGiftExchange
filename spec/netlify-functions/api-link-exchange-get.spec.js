import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {buildEvent} from '../shared/specHelper.js';

describe('api-link-exchange-get', () => {
    let db, handler, mongo;
    const getPath = '/.netlify/functions/api-link-exchange-get';

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.URL = 'https://test.netlify.app';
        const module = await import('../../netlify/functions/api-link-exchange-get.mjs');
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
            exchangeId: 'link-exchange-123',
            createdAt: new Date(),
            houses: [],
            participants: [
                {name: 'Alex', recipient: 'Whitney', hasDrawn: false},
                {name: 'Whitney', recipient: 'Alex', hasDrawn: true},
            ],
        });
    }

    it('returns 404 when exchangeId is missing', async () => {
        const response = await handler(buildEvent('GET', {path: getPath, queryStringParameters: {}}));
        expect(response.statusCode).toBe(404);
    });

    it('returns 404 for an unknown exchangeId', async () => {
        const response = await handler(buildEvent('GET', {path: getPath, queryStringParameters: {exchangeId: 'nope'}}));
        expect(response.statusCode).toBe(404);
    });

    it('returns names with hasDrawn flags', async () => {
        await seedLinkExchange();
        const response = await handler(buildEvent('GET', {path: getPath, queryStringParameters: {exchangeId: 'link-exchange-123'}}));

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.names).toEqual([
            {name: 'Alex', hasDrawn: false},
            {name: 'Whitney', hasDrawn: true},
        ]);
    });

    it('never includes the recipient field in the response', async () => {
        await seedLinkExchange();
        const response = await handler(buildEvent('GET', {path: getPath, queryStringParameters: {exchangeId: 'link-exchange-123'}}));
        expect(response.body).not.toContain('recipient');
    });
});
