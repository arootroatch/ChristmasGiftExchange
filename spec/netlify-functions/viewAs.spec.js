import {describe, it, expect, beforeAll, afterAll, afterEach, vi} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from "../shared/testData.js";
import {ObjectId} from "mongodb";

vi.mock("../../netlify/shared/logger.mjs");

describe("resolveViewAs", () => {
    let mongo, db, resolveViewAs, signSession, signViewAs;

    const admin = makeUser({name: "Admin", email: "admin@example.com"});
    const target = makeUser({name: "Target", email: "target@example.com"});
    const regular = makeUser({name: "Regular", email: "regular@example.com"});

    const eventWith = async (sessionUser, viewAsToken) => {
        const session = await signSession(sessionUser._id.toString());
        const cookie = viewAsToken ? `session=${session}; viewAs=${viewAsToken}` : `session=${session}`;
        return {headers: {cookie}};
    };

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret-key";
        process.env.ADMIN_EMAIL = "admin@example.com";
        ({resolveViewAs} = await import("../../netlify/shared/viewAs.mjs"));
        ({signSession, signViewAs} = await import("../../netlify/shared/jwt.mjs"));
    });

    afterEach(async () => {
        vi.useRealTimers();
        await cleanCollections(db, "users");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        delete process.env.ADMIN_EMAIL;
        await teardownMongo(mongo);
    });

    it("returns admin and target when admin has a valid viewAs cookie", async () => {
        await seedUsers(db, admin, target);
        const token = await signViewAs(admin._id.toString(), target._id.toString());
        const event = await eventWith(admin, token);

        const result = await resolveViewAs(event);

        expect(result.target._id.toString()).toBe(target._id.toString());
        expect(result.admin.email).toBe("admin@example.com");
    });

    it("returns null when there is no viewAs cookie", async () => {
        await seedUsers(db, admin, target);
        expect(await resolveViewAs(await eventWith(admin))).toBeNull();
    });

    it("returns null when a non-admin session carries a viewAs token naming itself as adminId", async () => {
        await seedUsers(db, regular, target);
        const token = await signViewAs(regular._id.toString(), target._id.toString());
        expect(await resolveViewAs(await eventWith(regular, token))).toBeNull();
    });

    it("returns null when the token adminId differs from the session user", async () => {
        await seedUsers(db, admin, target, regular);
        const token = await signViewAs(regular._id.toString(), target._id.toString());
        expect(await resolveViewAs(await eventWith(admin, token))).toBeNull();
    });

    it("returns null for a tampered token", async () => {
        await seedUsers(db, admin, target);
        const token = await signViewAs(admin._id.toString(), target._id.toString());
        expect(await resolveViewAs(await eventWith(admin, token + "x"))).toBeNull();
    });

    it("returns null for an expired token", async () => {
        await seedUsers(db, admin, target);
        const token = await signViewAs(admin._id.toString(), target._id.toString());
        const event = await eventWith(admin, token);
        vi.useFakeTimers({toFake: ["Date"]});
        vi.setSystemTime(Date.now() + 3601 * 1000);
        expect(await resolveViewAs(event)).toBeNull();
    });

    it("returns null when the target user does not exist", async () => {
        await seedUsers(db, admin);
        const token = await signViewAs(admin._id.toString(), new ObjectId().toString());
        expect(await resolveViewAs(await eventWith(admin, token))).toBeNull();
    });

    it("memoizes the result on the event so a second call does no lookup", async () => {
        await seedUsers(db, admin, target);
        const token = await signViewAs(admin._id.toString(), target._id.toString());
        const event = await eventWith(admin, token);
        const first = await resolveViewAs(event);
        await cleanCollections(db, "users");
        expect(await resolveViewAs(event)).toBe(first);
    });
});
