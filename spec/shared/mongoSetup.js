import {MongoMemoryServer} from 'mongodb-memory-server';
import {MongoClient} from 'mongodb';
import crypto from 'crypto';

//region MongoMemoryServer Lifecycle

let server;

export async function setup() {
    server = await MongoMemoryServer.create();
    process.env.MONGO_DB_URI = server.getUri();
    process.env.MONGODB_DATABASE = 'test-db';
}

export async function teardown() {
    await server.stop();
}

//endregion

//region Per-Test Isolation

export async function setupMongo() {
    const {vi} = await import('vitest');
    const {_setTestDb} = await import('../../netlify/shared/db.mjs');
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const dbName = `test-db-${crypto.randomUUID().slice(0, 8)}`;
    process.env.MONGODB_DATABASE = dbName;

    const client = new MongoClient(process.env.MONGO_DB_URI);
    await client.connect();
    const db = client.db(dbName);
    _setTestDb(db);

    return {client, db, consoleLogSpy, consoleErrorSpy, _setTestDb};
}

export async function teardownMongo({client, consoleLogSpy, consoleErrorSpy, _setTestDb}) {
    _setTestDb(null);
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    await client.close();
}

export async function cleanCollections(db, ...names) {
    for (const name of names) {
        await db.collection(name).deleteMany({});
    }
}

//endregion
