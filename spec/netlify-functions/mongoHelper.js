import {MongoClient} from 'mongodb';
import {vi} from 'vitest';

export async function setupMongo() {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const client = new MongoClient(process.env.MONGO_DB_URI);
    await client.connect();
    const db = client.db(process.env.MONGODB_DATABASE);

    return {client, db, consoleLogSpy, consoleErrorSpy};
}

export async function teardownMongo({client, consoleLogSpy, consoleErrorSpy}) {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    await client.close();
}

export async function cleanCollections(db, ...names) {
    for (const name of names) {
        await db.collection(name).deleteMany({});
    }
}
