import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";
import {buildEvent, makeUser} from "../shared/testFactories.js";

describe("api-user-get", () => {
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
        const mod = await import("../../netlify/functions/api-user-get.mjs");
        handler = mod.handler;
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "rateLimits");
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

    it("returns user data for authenticated user", async () => {
        const user = makeUser({
            name: "Alex",
            email: "alex@test.com",
            wishlists: [{url: "https://amazon.com/list", title: "My List"}],
            wishItems: [{url: "https://amazon.com/item", title: "Cool Thing", price: "$25"}],
        });
        await db.collection("users").insertOne(user);

        const event = buildEvent("GET", {headers: {cookie: await authCookie(user._id)}});
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

        const event = buildEvent("GET", {headers: {cookie: await authCookie(user._id)}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.token).toBeUndefined();
        expect(body._id).toBeUndefined();
    });
});
