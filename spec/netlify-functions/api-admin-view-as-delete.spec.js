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

describe("api-admin-view-as-delete", () => {
    let db, handler, mongo, logger;

    const admin = makeUser({email: "admin@example.com"});
    const regularUser = makeUser({email: "user@example.com"});

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret";
        process.env.ADMIN_EMAIL = "admin@example.com";
        ({logger} = await import("../../netlify/shared/logger.mjs"));
        ({handler} = await import("../../netlify/functions/api-admin-view-as-delete.mjs"));
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

    async function del(asUser) {
        return handler(buildEvent("DELETE", {headers: {cookie: await authCookie(asUser._id)}}));
    }

    it("clears the viewAs cookie", async () => {
        await seedUsers(db, admin);
        const response = await del(admin);
        expect(response.statusCode).toBe(200);
        expect(response.headers["Set-Cookie"]).toContain("viewAs=;");
        expect(response.headers["Set-Cookie"]).toContain("Max-Age=0");
    });

    it("returns 403 for a non-admin", async () => {
        await seedUsers(db, admin, regularUser);
        const response = await del(regularUser);
        expect(response.statusCode).toBe(403);
    });

    it("logs that view-as ended", async () => {
        await seedUsers(db, admin);
        await del(admin);
        expect(logger.info).toHaveBeenCalledWith("View-as ended", expect.any(Object));
    });
});
