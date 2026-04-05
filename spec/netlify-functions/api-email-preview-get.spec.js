import {afterAll, afterEach, beforeAll, describe, expect, it} from 'vitest';
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, makeExchange, seedUsers, seedExchange} from '../shared/testData.js';

describe('api-email-preview-get', () => {
    let handler, mongo, db;
    const originalContext = process.env.CONTEXT;

    beforeAll(async () => {
        process.env.CONTEXT = 'dev';
        mongo = await setupMongo();
        db = mongo.db;
        const module = await import('../../netlify/functions/api-email-preview-get.mjs');
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, 'users', 'exchanges');
    });

    afterAll(async () => {
        process.env.CONTEXT = originalContext;
        await teardownMongo(mongo);
    });

    it('returns 404 when CONTEXT is not dev', async () => {
        const savedContext = process.env.CONTEXT;
        process.env.CONTEXT = 'production';

        const response = await handler({httpMethod: 'GET', queryStringParameters: {}});
        expect(response.statusCode).toBe(404);

        process.env.CONTEXT = savedContext;
    });

    it('returns 405 for non-GET requests', async () => {
        const response = await handler({httpMethod: 'POST', queryStringParameters: {}});
        expect(response.statusCode).toBe(405);
    });

    it('returns template names when no template query param', async () => {
        const response = await handler({httpMethod: 'GET', queryStringParameters: {}});
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toContain('secretSanta');
        expect(body).toContain('resultsSummary');
        expect(body).toContain('wishlistNotification');
        expect(body).toContain('contactInfo');
        expect(body).toContain('errorAlert');
        expect(body).toContain('verificationCode');
        expect(body).not.toContain('layout');
        expect(body).not.toContain('escapeHtml');
        expect(body).not.toContain('wishlistLink');
    });

    it('returns rendered HTML for a valid template', async () => {
        const alex = makeUser({name: 'Alex', email: 'a@test.com'});
        const hunter = makeUser({name: 'Hunter', email: 'h@test.com'});

        await seedUsers(db, alex, hunter);
        await seedExchange(db, makeExchange({
            isSecretSanta: true,
            participants: [alex._id, hunter._id],
            assignments: [{giverId: alex._id, recipientId: hunter._id}],
        }));

        const response = await handler({
            httpMethod: 'GET',
            queryStringParameters: {template: 'secretSanta'},
        });

        expect(response.statusCode).toBe(200);
        expect(response.headers['Content-Type']).toBe('text/html');
        expect(response.body).toContain('Greetings, Alex!');
        expect(response.body).toContain('Hunter!');
    });

    it('returns 400 for unknown template name', async () => {
        const response = await handler({
            httpMethod: 'GET',
            queryStringParameters: {template: 'nonexistent'},
        });
        expect(response.statusCode).toBe(400);
    });
});
