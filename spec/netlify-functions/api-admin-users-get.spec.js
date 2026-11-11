import {describe, it, expect, beforeAll, afterAll, afterEach, vi} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, makeExchange, seedUsers, seedExchange} from "../shared/testData.js";
import {authCookie, buildEvent} from "../shared/specHelper.js";

vi.mock("../../netlify/shared/logger.mjs", () => ({
    logger: {info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn()},
}));

describe("api-admin-users-get", () => {
    let db, handler, mongo;

    const adminUser = makeUser({name: "Admin", email: "admin@example.com"});

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret";
        process.env.ADMIN_EMAIL = "admin@example.com";
        ({handler} = await import("../../netlify/functions/api-admin-users-get.mjs"));
    });

    afterEach(async () => {
        await cleanCollections(db, "users", "exchanges", "linkExchanges", "rateLimits");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        delete process.env.ADMIN_EMAIL;
        await teardownMongo(mongo);
    });

    async function search(q) {
        const event = buildEvent("GET", {
            headers: {cookie: await authCookie(adminUser._id)},
            ...(q !== undefined && {queryStringParameters: {q}}),
        });
        const response = await handler(event);
        return {response, body: JSON.parse(response.body)};
    }

    it("returns 403 for non-admin", async () => {
        const regular = makeUser({email: "user@example.com"});
        await seedUsers(db, regular);
        const response = await handler(buildEvent("GET", {headers: {cookie: await authCookie(regular._id)}}));
        expect(response.statusCode).toBe(403);
    });

    it("matches name case-insensitively and partially", async () => {
        await seedUsers(db, adminUser, makeUser({name: "Alice", email: "a@x.com"}), makeUser({name: "Bob", email: "b@x.com"}));
        const {body} = await search("ali");
        expect(body.users.map(u => u.name)).toEqual(["Alice"]);
    });

    it("matches email", async () => {
        await seedUsers(db, adminUser, makeUser({name: "Alice", email: "alice@foo.com"}), makeUser({name: "Bob", email: "bob@bar.com"}));
        const {body} = await search("BAR.com");
        expect(body.users.map(u => u.name)).toEqual(["Bob"]);
    });

    it("treats regex characters literally", async () => {
        await seedUsers(db, adminUser, makeUser({name: "Plus", email: "a+b@x.com"}), makeUser({name: "Other", email: "aab@x.com"}));
        const {response, body} = await search("a+b");
        expect(response.statusCode).toBe(200);
        expect(body.users.map(u => u.name)).toEqual(["Plus"]);
    });

    it("returns at most 50 users sorted by name", async () => {
        const users = Array.from({length: 60}, (_, i) => makeUser({name: `User ${String(i).padStart(2, "0")}`, email: `u${i}@x.com`}));
        await seedUsers(db, adminUser, ...users);
        const {body} = await search();
        expect(body.users).toHaveLength(50);
        expect(body.users.map(u => u.name)).toEqual([...body.users.map(u => u.name)].sort());
        expect(body.users[0].name).toBe("Admin");
    });

    it("includes stats for each user", async () => {
        const alice = makeUser({name: "Alice", email: "alice@x.com"});
        await seedUsers(db, adminUser, alice);
        await seedExchange(db, makeExchange({organizer: alice._id, participants: [alice._id]}));
        const {body} = await search("alice");
        const [user] = body.users;
        expect(user.organized.exchange).toBe(1);
        expect(user.participant.exchange).toBe(1);
        expect(user.total).toEqual({exchange: 1, secretSanta: 0, linkMode: 0});
    });

    it("marks the admin user with isAdmin", async () => {
        await seedUsers(db, adminUser, makeUser({name: "Alice", email: "alice@x.com"}));
        const {body} = await search();
        expect(body.users.find(u => u.email === "admin@example.com").isAdmin).toBe(true);
        expect(body.users.find(u => u.name === "Alice").isAdmin).toBe(false);
    });
});
