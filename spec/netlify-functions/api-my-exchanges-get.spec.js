import {afterAll, afterEach, beforeAll, describe, expect, it} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {ObjectId} from "mongodb";
import {makeUser, makeExchange, makeLinkExchange, alex, whitney, hunter, seedUsers, seedExchange, seedLinkExchange} from "../shared/testData.js";
import {authCookie, buildEvent} from "../shared/specHelper.js";

describe("api-my-exchanges-get", () => {
    let db, handler, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret";
        const module = await import("../../netlify/functions/api-my-exchanges-get.mjs");
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "exchanges", "rateLimits", "linkExchanges");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    async function setupExchanges() {
        await seedUsers(db, alex, whitney, hunter);

        await seedExchange(db, makeExchange({
            exchangeId: "exchange-2024",
            createdAt: new Date("2024-12-01"),
            isSecretSanta: true,
            participants: [alex._id, whitney._id, hunter._id],
            assignments: [
                {giverId: alex._id, recipientId: whitney._id},
                {giverId: whitney._id, recipientId: hunter._id},
                {giverId: hunter._id, recipientId: alex._id},
            ],
            houses: [{name: "Family", members: [alex._id, whitney._id]}],
        }));
        await seedExchange(db, makeExchange({
            exchangeId: "exchange-2023",
            createdAt: new Date("2023-12-01"),
            isSecretSanta: false,
            participants: [alex._id, whitney._id],
            assignments: [
                {giverId: alex._id, recipientId: whitney._id},
                {giverId: whitney._id, recipientId: alex._id},
            ],
        }));

        return {alexId: alex._id, whitneyId: whitney._id, hunterId: hunter._id};
    }

    it("returns 405 for non-GET requests", async () => {
        const event = buildEvent("POST");
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("returns 401 when no cookie present", async () => {
        const event = buildEvent("GET");
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it("returns exchanges WITHOUT assignments for authenticated user", async () => {
        const {alexId} = await setupExchanges();

        const event = buildEvent("GET", {headers: {cookie: await authCookie(alexId)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toHaveLength(2);

        const exchange = body[0];
        expect(exchange).toHaveProperty("exchangeId");
        expect(exchange).toHaveProperty("createdAt");
        expect(exchange).toHaveProperty("isSecretSanta");
        expect(exchange).toHaveProperty("participantNames");
        expect(exchange).toHaveProperty("houses");
        expect(exchange).toHaveProperty("participants");
        expect(exchange).not.toHaveProperty("assignments");
    });

    it("resolves participant names and emails", async () => {
        const {alexId} = await setupExchanges();

        const event = buildEvent("GET", {headers: {cookie: await authCookie(alexId)}});
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body[0].participantNames).toContain("Alex");
        expect(body[0].participantNames).toContain("Whitney");
        expect(body[0].participantNames).toContain("Hunter");

        const participant = body[0].participants[0];
        expect(participant).toHaveProperty("name");
        expect(participant).toHaveProperty("email");
    });

    it("includes house info with resolved names", async () => {
        const {alexId} = await setupExchanges();

        const event = buildEvent("GET", {headers: {cookie: await authCookie(alexId)}});
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body[0].houses).toHaveLength(1);
        expect(body[0].houses[0].name).toBe("Family");
        expect(body[0].houses[0].members).toContain("Alex");
        expect(body[0].houses[0].members).toContain("Whitney");
    });

    it("returns empty array when user has no exchanges", async () => {
        const loner = makeUser({name: "Loner", email: "loner@test.com"});
        await seedUsers(db, loner);

        const event = buildEvent("GET", {headers: {cookie: await authCookie(loner._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body).toEqual([]);
    });

    it("returns multiple exchanges sorted by createdAt desc", async () => {
        const {alexId} = await setupExchanges();

        const event = buildEvent("GET", {headers: {cookie: await authCookie(alexId)}});
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body).toHaveLength(2);
        expect(body[0].exchangeId).toBe("exchange-2024");
        expect(body[1].exchangeId).toBe("exchange-2023");
    });

    it('includes linkExchanges owned by the organizer, tagged isLinkMode', async () => {
        const organizer = makeUser({email: 'organizer@test.com'});
        await seedUsers(db, organizer);
        await db.collection('linkExchanges').insertOne({
            exchangeId: 'link-1',
            organizer: organizer._id,
            createdAt: new Date('2025-12-05'),
            houses: [{name: 'Family', members: ['Alex', 'Whitney']}],
            participants: [
                {name: 'Alex', recipient: 'Whitney', hasDrawn: true},
                {name: 'Whitney', recipient: 'Alex', hasDrawn: false},
            ],
        });

        const cookie = await authCookie(organizer._id);
        const response = await handler(buildEvent('GET', {headers: {cookie}}));
        const body = JSON.parse(response.body);

        const linkEntry = body.find(ex => ex.exchangeId === 'link-1');
        expect(linkEntry).toBeDefined();
        expect(linkEntry.isLinkMode).toBe(true);
        expect(linkEntry.participantNames).toEqual(['Alex', 'Whitney']);
        expect(linkEntry.participants.every(p => p.email === undefined)).toBe(true);
    });

    it('sorts merged exchanges and linkExchanges by createdAt descending', async () => {
        const {alexId} = await setupExchanges();
        await db.collection('linkExchanges').insertOne({
            exchangeId: 'link-newest',
            organizer: alexId,
            createdAt: new Date('2025-12-20'),
            houses: [],
            participants: [{name: 'Alex', recipient: 'Alex', hasDrawn: false}],
        });

        const cookie = await authCookie(alexId);
        const response = await handler(buildEvent('GET', {headers: {cookie}}));
        const body = JSON.parse(response.body);

        expect(body[0].exchangeId).toBe('link-newest');
    });
    describe("organizer results", () => {
        async function seedOrganizedSecretSanta(overrides = {}) {
            await seedUsers(db, alex, whitney, hunter);
            const exchange = makeExchange({
                exchangeId: "organized",
                organizer: alex._id,
                isSecretSanta: true,
                participants: [alex._id, whitney._id, hunter._id],
                assignments: [
                    {giverId: alex._id, recipientId: whitney._id},
                    {giverId: whitney._id, recipientId: hunter._id},
                    {giverId: hunter._id, recipientId: alex._id},
                ],
                ...overrides,
            });
            await seedExchange(db, exchange);
            return exchange;
        }

        async function getBody(userId) {
            const response = await handler(buildEvent("GET", {headers: {cookie: await authCookie(userId)}}));
            return JSON.parse(response.body);
        }

        it("includes results for exchanges the user organized", async () => {
            await seedOrganizedSecretSanta();

            const [exchange] = await getBody(alex._id);

            expect(exchange.isOrganizer).toBe(true);
            expect(exchange.results).toEqual([
                {giverName: "Alex", giverEmail: "alex@test.com", recipientName: "Whitney", recipientEmail: "whitney@test.com", recipientIsYou: false},
                {giverName: "Whitney", giverEmail: "whitney@test.com", recipientName: "Hunter", recipientEmail: "hunter@test.com", recipientIsYou: false},
                {giverName: "Hunter", giverEmail: "hunter@test.com", recipientName: "Alex", recipientEmail: "alex@test.com", recipientIsYou: true},
            ]);
            expect(exchange).not.toHaveProperty("assignments");
        });

        it("omits results for exchanges the user only participates in", async () => {
            await seedOrganizedSecretSanta({organizer: whitney._id});

            const [exchange] = await getBody(alex._id);

            expect(exchange.isOrganizer).toBe(false);
            expect(exchange.results).toBeUndefined();
        });

        it("omits results when exchange has no organizer", async () => {
            const seeded = await seedOrganizedSecretSanta();
            await db.collection("exchanges").updateOne({_id: seeded._id}, {$unset: {organizer: ""}});

            const [exchange] = await getBody(alex._id);

            expect(exchange.isOrganizer).toBe(false);
            expect(exchange).not.toHaveProperty("results");
        });

        it("uses Unknown for missing users", async () => {
            const ghostId = new ObjectId();
            await seedOrganizedSecretSanta({
                participants: [alex._id, whitney._id, ghostId],
                assignments: [
                    {giverId: alex._id, recipientId: ghostId},
                    {giverId: ghostId, recipientId: whitney._id},
                    {giverId: whitney._id, recipientId: alex._id},
                ],
            });

            const [exchange] = await getBody(alex._id);

            expect(exchange.results[0]).toMatchObject({recipientName: "Unknown", recipientEmail: ""});
            expect(exchange.results[1]).toEqual({
                giverName: "Unknown", giverEmail: "", recipientName: "Whitney", recipientEmail: "whitney@test.com", recipientIsYou: false,
            });
        });

        async function seedOrganizedLinkExchange(participants) {
            await seedUsers(db, alex);
            await seedLinkExchange(db, makeLinkExchange({organizer: alex._id, participants}));
        }

        it("link exchange: hides recipients of participants who have not drawn", async () => {
            await seedOrganizedLinkExchange([
                {name: "Whitney", recipient: "Hunter", hasDrawn: false},
                {name: "Hunter", recipient: "Whitney", hasDrawn: true},
            ]);

            const [exchange] = await getBody(alex._id);

            expect(exchange.isOrganizer).toBe(true);
            expect(exchange.results).toEqual([
                {giverName: "Whitney", hasDrawn: false, recipientName: null, recipientIsYou: false},
                {giverName: "Hunter", hasDrawn: true, recipientName: "Whitney", recipientIsYou: false},
            ]);
        });

        it("link exchange: flags the row whose recipient is the organizer", async () => {
            await seedOrganizedLinkExchange([
                {name: "Alex", recipient: "Hunter", hasDrawn: true},
                {name: "Whitney", recipient: "Alex", hasDrawn: true},
                {name: "Hunter", recipient: "Whitney", hasDrawn: true},
            ]);

            const [exchange] = await getBody(alex._id);

            expect(exchange.organizerMatched).toBe(true);
            expect(exchange.results.map(r => r.recipientIsYou)).toEqual([false, true, false]);
        });

        it("matches organizer name case-insensitively", async () => {
            await seedOrganizedLinkExchange([
                {name: " alex ", recipient: "Whitney", hasDrawn: true},
                {name: "Whitney", recipient: " alex ", hasDrawn: true},
            ]);

            const [exchange] = await getBody(alex._id);

            expect(exchange.organizerMatched).toBe(true);
            expect(exchange.results.map(r => r.recipientIsYou)).toEqual([false, true]);
        });

        it("link exchange: organizerMatched false when no participant matches", async () => {
            await seedOrganizedLinkExchange([
                {name: "Whitney", recipient: "Hunter", hasDrawn: true},
                {name: "Hunter", recipient: "Whitney", hasDrawn: true},
            ]);

            const [exchange] = await getBody(alex._id);

            expect(exchange.organizerMatched).toBe(false);
            expect(exchange.results.every(r => r.recipientIsYou === false)).toBe(true);
        });
    });
});
