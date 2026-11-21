import {describe, it, expect, beforeAll, afterAll, afterEach} from "vitest";
import {setupMongo, teardownMongo, cleanCollections} from '../shared/mongoSetup.js';
import {makeExchange, makeLinkExchange, seedExchange, seedLinkExchange, makeUser} from "../shared/testData.js";

describe("computeUserStats", () => {
    let db, computeUserStats, mongo;

    beforeAll(async () => {
        mongo = await setupMongo();
        ({db} = mongo);
        ({computeUserStats} = await import("../../netlify/shared/userStats.mjs"));
    });

    afterEach(async () => {
        await cleanCollections(db, "exchanges", "linkExchanges");
    });

    afterAll(async () => {
        await teardownMongo(mongo);
    });

    it("counts a regular exchange the user participates in", async () => {
        const user = makeUser();
        await seedExchange(db, makeExchange({participants: [user._id]}));
        const stats = (await computeUserStats([user._id])).get(user._id.toString());
        expect(stats.participant).toEqual({exchange: 1, secretSanta: 0, linkMode: 0});
        expect(stats.total).toEqual({exchange: 1, secretSanta: 0, linkMode: 0});
        expect(stats.organized).toEqual({exchange: 0, secretSanta: 0, linkMode: 0});
    });

    const statsFor = async (user) => (await computeUserStats([user._id])).get(user._id.toString());

    it("counts secret santa separately from regular exchanges", async () => {
        const user = makeUser();
        await seedExchange(db, makeExchange({participants: [user._id], isSecretSanta: true}));
        const stats = await statsFor(user);
        expect(stats.participant).toEqual({exchange: 0, secretSanta: 1, linkMode: 0});
        expect(stats.total).toEqual({exchange: 0, secretSanta: 1, linkMode: 0});
    });

    it("counts organized exchanges from the organizer field", async () => {
        const user = makeUser();
        await seedExchange(db, makeExchange({organizer: user._id, participants: []}));
        await seedExchange(db, makeExchange({organizer: user._id, participants: [], isSecretSanta: true}));
        const stats = await statsFor(user);
        expect(stats.organized).toEqual({exchange: 1, secretSanta: 1, linkMode: 0});
        expect(stats.participant).toEqual({exchange: 0, secretSanta: 0, linkMode: 0});
    });

    it("does not count an exchange with no organizer as organized", async () => {
        const user = makeUser();
        const exchange = makeExchange({participants: [user._id]});
        delete exchange.organizer;
        await seedExchange(db, exchange);
        const stats = await statsFor(user);
        expect(stats.organized.exchange).toBe(0);
        expect(stats.participant.exchange).toBe(1);
    });

    it("counts an exchange once in total when the user organized and participated", async () => {
        const user = makeUser();
        await seedExchange(db, makeExchange({organizer: user._id, participants: [user._id]}));
        const stats = await statsFor(user);
        expect(stats.organized.exchange).toBe(1);
        expect(stats.participant.exchange).toBe(1);
        expect(stats.total.exchange).toBe(1);
    });

    it("counts link exchanges as organized and total only", async () => {
        const user = makeUser();
        await seedLinkExchange(db, makeLinkExchange({organizer: user._id}));
        const stats = await statsFor(user);
        expect(stats.organized.linkMode).toBe(1);
        expect(stats.participant.linkMode).toBe(0);
        expect(stats.total.linkMode).toBe(1);
    });

    it("treats a missing isSecretSanta as a regular exchange", async () => {
        const user = makeUser();
        const exchange = makeExchange({participants: [user._id]});
        delete exchange.isSecretSanta;
        await seedExchange(db, exchange);
        const stats = await statsFor(user);
        expect(stats.participant).toEqual({exchange: 1, secretSanta: 0, linkMode: 0});
    });

    it("returns zero stats for a user with no exchanges", async () => {
        const user = makeUser();
        const zero = {exchange: 0, secretSanta: 0, linkMode: 0};
        expect(await statsFor(user)).toEqual({organized: zero, participant: zero, total: zero});
    });
});
