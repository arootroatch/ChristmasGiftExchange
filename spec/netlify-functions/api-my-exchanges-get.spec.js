import {afterAll, afterEach, beforeAll, describe, expect, it} from "vitest";
import {ObjectId} from "mongodb";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";
import {buildEvent} from "../shared/testFactories.js";

describe("api-my-exchanges-get", () => {
    let db, handler, mongo;

    async function authCookie(userId) {
        const {signSession} = await import("../../netlify/shared/jwt.mjs");
        const jwt = await signSession(userId.toString());
        return `session=${jwt}`;
    }

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret";
        const module = await import("../../netlify/functions/api-my-exchanges-get.mjs");
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "exchanges", "rateLimits");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    async function setupExchanges() {
        const alexId = new ObjectId();
        const whitneyId = new ObjectId();
        const hunterId = new ObjectId();

        await db.collection("users").insertMany([
            {_id: alexId, email: "alex@test.com", name: "Alex", wishlists: [], wishItems: []},
            {_id: whitneyId, email: "whitney@test.com", name: "Whitney", wishlists: [], wishItems: []},
            {_id: hunterId, email: "hunter@test.com", name: "Hunter", wishlists: [], wishItems: []},
        ]);

        await db.collection("exchanges").insertMany([
            {
                exchangeId: "exchange-2024",
                createdAt: new Date("2024-12-01"),
                isSecretSanta: true,
                participants: [alexId, whitneyId, hunterId],
                assignments: [
                    {giverId: alexId, recipientId: whitneyId},
                    {giverId: whitneyId, recipientId: hunterId},
                    {giverId: hunterId, recipientId: alexId},
                ],
                houses: [{name: "Family", members: [alexId, whitneyId]}],
            },
            {
                exchangeId: "exchange-2023",
                createdAt: new Date("2023-12-01"),
                isSecretSanta: false,
                participants: [alexId, whitneyId],
                assignments: [
                    {giverId: alexId, recipientId: whitneyId},
                    {giverId: whitneyId, recipientId: alexId},
                ],
                houses: [],
            },
        ]);

        return {alexId, whitneyId, hunterId};
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
        const userId = new ObjectId();
        await db.collection("users").insertOne({
            _id: userId, email: "loner@test.com", name: "Loner", wishlists: [], wishItems: [],
        });

        const event = buildEvent("GET", {headers: {cookie: await authCookie(userId)}});
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
});
