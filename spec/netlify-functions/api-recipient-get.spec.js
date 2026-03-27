import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";
import {buildEvent, makeUser, makeExchange} from "../shared/testFactories.js";

describe("api-recipient-get", () => {
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
        const mod = await import("../../netlify/functions/api-recipient-get.mjs");
        handler = mod.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "exchanges", "rateLimits");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    it("rejects non-GET requests", async () => {
        const event = buildEvent("POST");
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("returns 401 when no cookie present", async () => {
        const event = buildEvent("GET");
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it("returns recipient name, giverName, date, and exchangeId for authenticated user", async () => {
        const giver = makeUser({name: "Alex", email: "alex@test.com"});
        const recipient = makeUser({
            name: "Whitney",
            email: "whitney@test.com",
            wishlists: [{url: "https://amazon.com/list", title: "My List"}],
            wishItems: [{url: "https://amazon.com/item", title: "Cool Thing", price: 2500}],
            currency: "USD",
        });

        await db.collection("users").insertMany([giver, recipient]);

        const exchange = makeExchange({
            exchangeId: "exchange-123",
            participants: [giver._id, recipient._id],
            assignments: [
                {giverId: giver._id, recipientId: recipient._id},
                {giverId: recipient._id, recipientId: giver._id},
            ],
            createdAt: new Date("2025-12-01"),
        });
        await db.collection("exchanges").insertOne(exchange);

        const event = buildEvent("GET", {headers: {cookie: await authCookie(giver._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.name).toBe("Whitney");
        expect(body.date).toBeDefined();
        expect(body.exchangeId).toBe("exchange-123");
        expect(body.wishlists).toHaveLength(1);
        expect(body.wishlists[0].title).toBe("My List");
        expect(body.wishItems).toHaveLength(1);
        expect(body.wishItems[0].title).toBe("Cool Thing");
        expect(body.currency).toBe("USD");
    });

    it("returns the most recent exchange", async () => {
        const giver = makeUser({name: "Alex", email: "alex@test.com"});
        const oldRecipient = makeUser({name: "Old Recipient", email: "old@test.com"});
        const newRecipient = makeUser({name: "New Recipient", email: "new@test.com"});

        await db.collection("users").insertMany([giver, oldRecipient, newRecipient]);

        const oldExchange = makeExchange({
            exchangeId: "old-exchange",
            participants: [giver._id, oldRecipient._id],
            assignments: [{giverId: giver._id, recipientId: oldRecipient._id}],
            createdAt: new Date("2023-12-01"),
        });
        const newExchange = makeExchange({
            exchangeId: "new-exchange",
            participants: [giver._id, newRecipient._id],
            assignments: [{giverId: giver._id, recipientId: newRecipient._id}],
            createdAt: new Date("2025-12-01"),
        });
        await db.collection("exchanges").insertMany([oldExchange, newExchange]);

        const event = buildEvent("GET", {headers: {cookie: await authCookie(giver._id)}});
        const response = await handler(event);
        const body = JSON.parse(response.body);

        expect(body.name).toBe("New Recipient");
        expect(body.exchangeId).toBe("new-exchange");
    });

    it("returns 404 when user has no exchanges", async () => {
        const user = makeUser({name: "Lonely", email: "lonely@test.com"});
        await db.collection("users").insertOne(user);

        const event = buildEvent("GET", {headers: {cookie: await authCookie(user._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
    });

    it("returns 404 when user is not a giver in any exchange", async () => {
        const user = makeUser({name: "Alex", email: "alex@test.com"});
        const otherGiver = makeUser({name: "Other", email: "other@test.com"});

        await db.collection("users").insertMany([user, otherGiver]);

        const exchange = makeExchange({
            participants: [user._id, otherGiver._id],
            assignments: [{giverId: otherGiver._id, recipientId: user._id}],
            createdAt: new Date("2025-12-01"),
        });
        await db.collection("exchanges").insertOne(exchange);

        const event = buildEvent("GET", {headers: {cookie: await authCookie(user._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(404);
    });
});
