import {describe, it, expect, beforeAll, afterAll, afterEach, vi} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from "../shared/testData.js";
import {authCookie, buildEvent} from "../shared/specHelper.js";

vi.mock("../../netlify/shared/logger.mjs", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    },
}));

describe("api-admin-view-as-post", () => {
    let db, handler, mongo, logger, verifyViewAs;

    const admin = makeUser({email: "admin@example.com"});
    const target = makeUser({email: "target@example.com"});

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret";
        process.env.ADMIN_EMAIL = "admin@example.com";
        ({logger} = await import("../../netlify/shared/logger.mjs"));
        ({verifyViewAs} = await import("../../netlify/shared/jwt.mjs"));
        ({handler} = await import("../../netlify/functions/api-admin-view-as-post.mjs"));
    });

    afterEach(async () => {
        vi.clearAllMocks();
        await cleanCollections(db, "users", "rateLimits");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        delete process.env.ADMIN_EMAIL;
        await teardownMongo(mongo);
    });

    async function post(userId, asUser = admin) {
        return handler(buildEvent("POST", {
            body: {userId},
            headers: {cookie: await authCookie(asUser._id)},
        }));
    }

    it("sets a viewAs cookie naming the target", async () => {
        await seedUsers(db, admin, target);
        const response = await post(target._id.toString());
        expect(response.statusCode).toBe(200);
        const cookie = response.headers["Set-Cookie"];
        const token = cookie.match(/^viewAs=([^;]+)/)[1];
        const payload = await verifyViewAs(token);
        expect(payload.targetUserId).toBe(target._id.toString());
        expect(payload.adminId).toBe(admin._id.toString());
    });

    it("returns 403 for a non-admin", async () => {
        await seedUsers(db, admin, target);
        const response = await post(admin._id.toString(), target);
        expect(response.statusCode).toBe(403);
    });

    it("returns 404 for an unknown user", async () => {
        await seedUsers(db, admin);
        const response = await post("a".repeat(24));
        expect(response.statusCode).toBe(404);
        expect(JSON.parse(response.body).error).toBe("User not found");
    });

    it("returns 400 when viewing as yourself", async () => {
        await seedUsers(db, admin);
        const response = await post(admin._id.toString());
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toBe("Cannot view as yourself");
    });

    it("returns 400 for a malformed user id", async () => {
        await seedUsers(db, admin);
        const response = await post("not-an-id");
        expect(response.statusCode).toBe(400);
    });

    it("logs that view-as started", async () => {
        await seedUsers(db, admin, target);
        await post(target._id.toString());
        expect(logger.info).toHaveBeenCalledWith("View-as started", expect.objectContaining({
            targetUserId: target._id.toString(),
            targetEmail: "target@example.com",
        }));
    });

    it("does not set a session cookie", async () => {
        await seedUsers(db, admin, target);
        const response = await post(target._id.toString());
        expect(JSON.stringify(response.headers)).not.toContain("session=");
    });
});
