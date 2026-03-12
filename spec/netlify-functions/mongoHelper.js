import {MongoClient} from 'mongodb';
import crypto from 'crypto';
import {vi} from 'vitest';
import {_setTestDb} from '../../netlify/shared/db.mjs';

export async function setupMongo() {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const dbName = `test-db-${crypto.randomUUID().slice(0, 8)}`;
    process.env.MONGODB_DATABASE = dbName;

    const client = new MongoClient(process.env.MONGO_DB_URI);
    await client.connect();
    const db = client.db(dbName);
    _setTestDb(db);

    return {client, db, consoleLogSpy, consoleErrorSpy};
}

export async function teardownMongo({client, consoleLogSpy, consoleErrorSpy}) {
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
