import {describe, it, expect, beforeAll, afterAll, afterEach, vi} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeUser, seedUsers} from '../shared/testData.js';
import {ObjectId, Collection} from "mongodb";

vi.mock("../../netlify/shared/logger.mjs");

describe("requireAuth", () => {
    let mongo, db, requireAuth, signSession;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret-key";
        const middlewareMod = await import("../../netlify/shared/middleware.mjs");
        requireAuth = middlewareMod.requireAuth;
        const jwtMod = await import("../../netlify/shared/jwt.mjs");
        signSession = jwtMod.signSession;
    });

    afterEach(async () => {
        await cleanCollections(db, "users");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    it("returns 401 when no cookie present", async () => {
        const event = {headers: {}};
        const result = await requireAuth(event);
        expect(result.statusCode).toBe(401);
    });

    it("returns 401 for invalid JWT", async () => {
        const event = {headers: {cookie: "session=invalid.jwt"}};
        const result = await requireAuth(event);
        expect(result.statusCode).toBe(401);
    });

    it("returns 401 when user not found in DB", async () => {
        const {ObjectId} = await import("mongodb");
        const jwt = await signSession(new ObjectId().toString());
        const event = {headers: {cookie: `session=${jwt}`}};
        const result = await requireAuth(event);
        expect(result.statusCode).toBe(401);
    });

    it("attaches user to event and returns null on success", async () => {
        const user = makeUser({name: "Test", email: "test@test.com"});
        await seedUsers(db, user);

        const jwt = await signSession(user._id.toString());
        const event = {headers: {cookie: `session=${jwt}`}};
        const result = await requireAuth(event);
        expect(result).toBeNull();
        expect(event.user).toBeDefined();
        expect(event.user.name).toBe("Test");
    });
});

describe("requireAuth with view-as", () => {
    let mongo, db, requireAuth, requireRealUser, signSession, signViewAs;

    const admin = makeUser({name: "Admin", email: "admin@example.com"});
    const target = makeUser({name: "Target", email: "target@example.com"});

    const cookieFor = async (viewAsTargetId) => {
        const session = await signSession(admin._id.toString());
        if (!viewAsTargetId) return `session=${session}`;
        const viewAs = await signViewAs(admin._id.toString(), viewAsTargetId);
        return `session=${session}; viewAs=${viewAs}`;
    };

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret-key";
        process.env.ADMIN_EMAIL = "admin@example.com";
        ({requireAuth, requireRealUser} = await import("../../netlify/shared/middleware.mjs"));
        ({signSession, signViewAs} = await import("../../netlify/shared/jwt.mjs"));
    });

    afterEach(async () => {
        await cleanCollections(db, "users");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        delete process.env.ADMIN_EMAIL;
        await teardownMongo(mongo);
    });

    it("sets event.user to target and event.viewer to admin when view-as is active", async () => {
        await seedUsers(db, admin, target);
        const event = {headers: {cookie: await cookieFor(target._id.toString())}};

        const result = await requireAuth(event);

        expect(result).toBeNull();
        expect(event.user.email).toBe("target@example.com");
        expect(event.viewer.email).toBe("admin@example.com");
    });

    it("leaves event.viewer undefined when no viewAs cookie", async () => {
        await seedUsers(db, admin, target);
        const event = {headers: {cookie: await cookieFor()}};

        await requireAuth(event);

        expect(event.user.email).toBe("admin@example.com");
        expect(event.viewer).toBeUndefined();
    });

    it("requireRealUser keeps event.user as the admin even when view-as is active", async () => {
        await seedUsers(db, admin, target);
        const event = {headers: {cookie: await cookieFor(target._id.toString())}};

        const result = await requireRealUser(event);

        expect(result).toBeNull();
        expect(event.user.email).toBe("admin@example.com");
        expect(event.viewer).toBeUndefined();
    });

    it("looks up the session user only once when there is no viewAs cookie", async () => {
        await seedUsers(db, admin);
        const event = {headers: {cookie: await cookieFor()}};
        const findOne = vi.spyOn(Collection.prototype, "findOne");

        await requireAuth(event);

        expect(findOne).toHaveBeenCalledTimes(1);
        findOne.mockRestore();
    });

    it("looks up the session user only once when view-as is active (plus the target)", async () => {
        await seedUsers(db, admin, target);
        const event = {headers: {cookie: await cookieFor(target._id.toString())}};
        const findOne = vi.spyOn(Collection.prototype, "findOne");

        await requireAuth(event);

        expect(findOne).toHaveBeenCalledTimes(2);
        findOne.mockRestore();
    });

    it("uses the admin as event.user when the viewAs target no longer exists", async () => {
        await seedUsers(db, admin);
        const event = {headers: {cookie: await cookieFor(new ObjectId().toString())}};

        const result = await requireAuth(event);

        expect(result).toBeNull();
        expect(event.user.email).toBe("admin@example.com");
        expect(event.viewer).toBeUndefined();
    });
});

describe("validateOrigin", () => {
    let validateOrigin;

    beforeAll(async () => {
        const mod = await import("../../netlify/shared/middleware.mjs");
        validateOrigin = mod.validateOrigin;
    });

    it("allows requests with matching origin", () => {
        const event = {headers: {origin: "https://gift-exchange-generator.com"}};
        expect(validateOrigin(event)).toBeNull();
    });

    it("rejects requests with mismatched origin", () => {
        const event = {headers: {origin: "https://evil.com"}};
        const result = validateOrigin(event);
        expect(result.statusCode).toBe(403);
    });

    it("allows requests with no origin header", () => {
        const event = {headers: {}};
        expect(validateOrigin(event)).toBeNull();
    });
});

describe("getOptionalUser", () => {
    let mongo, db, getOptionalUser, signSession;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret-key";
        const middlewareMod = await import("../../netlify/shared/middleware.mjs");
        getOptionalUser = middlewareMod.getOptionalUser;
        const jwtMod = await import("../../netlify/shared/jwt.mjs");
        signSession = jwtMod.signSession;
    });

    afterEach(async () => {
        await cleanCollections(db, "users");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        await teardownMongo(mongo);
    });

    it("returns null when no cookie present", async () => {
        const result = await getOptionalUser({headers: {}});
        expect(result).toBeNull();
    });

    it("returns null for an invalid JWT", async () => {
        const result = await getOptionalUser({headers: {cookie: "session=invalid.jwt"}});
        expect(result).toBeNull();
    });

    it("returns null when user not found in DB", async () => {
        const {ObjectId} = await import("mongodb");
        const jwt = await signSession(new ObjectId().toString());
        const result = await getOptionalUser({headers: {cookie: `session=${jwt}`}});
        expect(result).toBeNull();
    });

    it("returns the user for a valid session", async () => {
        const user = makeUser({name: "Test", email: "test@test.com"});
        await seedUsers(db, user);
        const jwt = await signSession(user._id.toString());
        const result = await getOptionalUser({headers: {cookie: `session=${jwt}`}});
        expect(result.name).toBe("Test");
    });
});

describe("getOptionalUser with view-as", () => {
    let mongo, db, getOptionalUser, signSession, signViewAs;

    const admin = makeUser({name: "Admin", email: "admin@example.com"});
    const target = makeUser({name: "Target", email: "target@example.com"});

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        process.env.JWT_SECRET = "test-secret-key";
        process.env.ADMIN_EMAIL = "admin@example.com";
        ({getOptionalUser} = await import("../../netlify/shared/middleware.mjs"));
        ({signSession, signViewAs} = await import("../../netlify/shared/jwt.mjs"));
    });

    afterEach(async () => {
        await cleanCollections(db, "users");
    });

    afterAll(async () => {
        delete process.env.JWT_SECRET;
        delete process.env.ADMIN_EMAIL;
        await teardownMongo(mongo);
    });

    it("looks up the session user only once when there is no viewAs cookie", async () => {
        await seedUsers(db, admin);
        const session = await signSession(admin._id.toString());
        const findOne = vi.spyOn(Collection.prototype, "findOne");

        await getOptionalUser({headers: {cookie: `session=${session}`}});

        expect(findOne).toHaveBeenCalledTimes(1);
        findOne.mockRestore();
    });

    it("returns the target when view-as is active", async () => {
        await seedUsers(db, admin, target);
        const session = await signSession(admin._id.toString());
        const viewAs = await signViewAs(admin._id.toString(), target._id.toString());

        const result = await getOptionalUser({headers: {cookie: `session=${session}; viewAs=${viewAs}`}});

        expect(result.email).toBe("target@example.com");
    });
});
