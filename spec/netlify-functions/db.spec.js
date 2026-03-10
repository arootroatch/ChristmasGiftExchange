import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';

describe('db utility', () => {
    let consoleLogSpy;
    let consoleErrorSpy;
    let getDb, getUsersCollection, getExchangesCollection, getLegacyCollection;

    beforeAll(async () => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const module = await import('../../netlify/shared/db.mjs');
        getDb = module.getDb;
        getUsersCollection = module.getUsersCollection;
        getExchangesCollection = module.getExchangesCollection;
        getLegacyCollection = module.getLegacyCollection;
    });

    afterAll(async () => {
        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    describe('getDb', () => {
        it('returns a database object', async () => {
            const db = await getDb();
            expect(db).toBeDefined();
            expect(db.databaseName).toBe('test-db');
        });
    });

    describe('getUsersCollection', () => {
        it('returns the users collection', async () => {
            const collection = await getUsersCollection();
            expect(collection).toBeDefined();
            expect(collection.collectionName).toBe('users');
        });

        it('can insert and retrieve documents', async () => {
            const collection = await getUsersCollection();
            await collection.insertOne({email: 'test@test.com', name: 'Test'});
            const doc = await collection.findOne({email: 'test@test.com'});
            expect(doc.name).toBe('Test');
            await collection.deleteMany({});
        });
    });

    describe('getExchangesCollection', () => {
        it('returns the exchanges collection', async () => {
            const collection = await getExchangesCollection();
            expect(collection).toBeDefined();
            expect(collection.collectionName).toBe('exchanges');
        });
    });

    describe('getLegacyCollection', () => {
        it('returns the legacy collection using MONGODB_COLLECTION env var', async () => {
            const collection = await getLegacyCollection();
            expect(collection).toBeDefined();
            expect(collection.collectionName).toBe('legacy-names');
        });
    });
});

describe("getDb with failed connection", () => {
    it("throws 'Database unavailable' when connection fails", async () => {
        const originalUri = process.env.MONGO_DB_URI;
        process.env.MONGO_DB_URI = "mongodb://localhost:27099/?serverSelectionTimeoutMS=100";

        vi.resetModules();
        const {getDb} = await import("../../netlify/shared/db.mjs");

        await expect(getDb()).rejects.toThrow("Database unavailable");

        process.env.MONGO_DB_URI = originalUri;
        vi.resetModules();
    }, 5000);
});
