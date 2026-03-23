import {afterAll, afterEach, beforeAll, describe, expect, it} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";
import {buildEvent, makeUser, makeExchange} from "../shared/testFactories.js";

describe("api-user-wishlist-get", () => {
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
        const module = await import("../../netlify/functions/api-user-wishlist-get.mjs");
        handler = module.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "exchanges", "rateLimits");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    async function setupExchange() {
        const giver = makeUser({name: "Alex", email: "giver@test.com"});
        const recipient = makeUser({
            name: "Whitney",
            email: "recipient@test.com",
            wishlists: [{url: "https://amazon.com/list", title: "My List"}],
            wishItems: [{url: "https://amazon.com/item", title: "Cool Thing", price: "$25"}],
        });
        const outsider = makeUser({name: "Outsider", email: "outsider@test.com"});

        await db.collection("users").insertMany([giver, recipient, outsider]);

        const exchange = makeExchange({
            exchangeId: "exchange-view",
            isSecretSanta: true,
            participants: [giver._id, recipient._id],
            assignments: [{giverId: giver._id, recipientId: recipient._id}],
        });
        await db.collection("exchanges").insertOne(exchange);

        return {giver, recipient, outsider};
    }

    it("returns 405 for non-GET requests", async () => {
        const event = buildEvent("POST");
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("returns 401 when no cookie present", async () => {
        const event = buildEvent("GET", {queryStringParameters: {exchangeId: "abc"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it("returns 400 when exchangeId is missing", async () => {
        const {giver} = await setupExchange();
        const event = buildEvent("GET", {headers: {cookie: await authCookie(giver._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it("returns 404 for non-existent exchange", async () => {
        const {giver} = await setupExchange();
        const event = buildEvent("GET", {
            queryStringParameters: {exchangeId: "nonexistent"},
            headers: {cookie: await authCookie(giver._id)},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body).error).toBe("Exchange not found");
    });

    it("returns 403 when user is not a giver in the exchange", async () => {
        const {outsider} = await setupExchange();
        const event = buildEvent("GET", {
            queryStringParameters: {exchangeId: "exchange-view"},
            headers: {cookie: await authCookie(outsider._id)},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(403);
        expect(JSON.parse(response.body).error).toContain("don't have access");
    });

    it("returns recipient wishlist data for valid giver", async () => {
        const {giver} = await setupExchange();
        const event = buildEvent("GET", {
            queryStringParameters: {exchangeId: "exchange-view"},
            headers: {cookie: await authCookie(giver._id)},
        });
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.recipientName).toBe("Whitney");
        expect(body.wishlists).toHaveLength(1);
        expect(body.wishlists[0].url).toBe("https://amazon.com/list");
        expect(body.wishItems).toHaveLength(1);
        expect(body.wishItems[0].title).toBe("Cool Thing");
    });
});
