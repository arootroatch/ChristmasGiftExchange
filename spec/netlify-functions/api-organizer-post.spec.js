import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from "./mongoHelper.js";
import {buildEvent} from "../shared/testFactories.js";

describe("api-organizer-post", () => {
    let client, db, handler, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({client, db} = mongo);
        const mod = await import("../../netlify/functions/api-organizer-post.mjs");
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

    it("rejects missing name", async () => {
        const event = buildEvent("POST", {body: {email: "test@test.com"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it("rejects missing email", async () => {
        const event = buildEvent("POST", {body: {name: "Test"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it("rejects invalid email", async () => {
        const event = buildEvent("POST", {body: {name: "Test", email: "not-an-email"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(400);
    });

    it("creates new user and returns token", async () => {
        const event = buildEvent("POST", {body: {name: "Alex", email: "alex@test.com"}});
        const response = await handler(event);
        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.body);
        expect(body.token).toBeDefined();
        expect(body.token).toMatch(/^[0-9a-f-]{36}$/);

        const user = await db.collection("users").findOne({email: "alex@test.com"});
        expect(user.name).toBe("Alex");
        expect(user.token).toBe(body.token);
    });

    it("returns existing token for existing user", async () => {
        const event = buildEvent("POST", {body: {name: "Alex", email: "alex@test.com"}});
        const response1 = await handler(event);
        const token1 = JSON.parse(response1.body).token;

        const response2 = await handler(event);
        const token2 = JSON.parse(response2.body).token;

        expect(token1).toBe(token2);
    });

    it("updates name for existing user", async () => {
        const event1 = buildEvent("POST", {body: {name: "Alex", email: "alex@test.com"}});
        await handler(event1);

        const event2 = buildEvent("POST", {body: {name: "Alexander", email: "alex@test.com"}});
        await handler(event2);

        const user = await db.collection("users").findOne({email: "alex@test.com"});
        expect(user.name).toBe("Alexander");
    });
});
