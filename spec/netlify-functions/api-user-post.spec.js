import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";
import {buildEvent, makeUser} from "../shared/testFactories.js";

describe("api-user-post", () => {
    let client, db, handler, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const mod = await import("../../netlify/functions/api-user-post.mjs");
        handler = mod.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "rateLimits");
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it("rejects non-POST requests", async () => {
        const event = buildEvent("GET");
        const response = await handler(event);
        expect(response.statusCode).toBe(405);
    });

    it("rejects missing token", async () => {
        const event = buildEvent("POST", {body: {}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it("returns 401 for invalid token", async () => {
        const event = buildEvent("POST", {body: {token: "nonexistent-token"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(401);
    });

    it("returns user data for valid token", async () => {
        const user = makeUser({
            name: "Alex",
            email: "alex@test.com",
            wishlists: [{url: "https://amazon.com/list", title: "My List"}],
            wishItems: [{url: "https://amazon.com/item", title: "Cool Thing", price: "$25"}],
        });
        await db.collection("users").insertOne(user);

        const event = buildEvent("POST", {body: {token: user.token}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.name).toBe("Alex");
        expect(body.wishlists).toHaveLength(1);
        expect(body.wishlists[0].url).toBe("https://amazon.com/list");
        expect(body.wishItems).toHaveLength(1);
        expect(body.wishItems[0].title).toBe("Cool Thing");
    });

    it("does not include token or _id in response", async () => {
        const user = makeUser({name: "Alex", email: "alex@test.com"});
        await db.collection("users").insertOne(user);

        const event = buildEvent("POST", {body: {token: user.token}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.token).toBeUndefined();
        expect(body._id).toBeUndefined();
    });
});
