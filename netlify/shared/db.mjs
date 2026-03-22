import {MongoClient} from "mongodb";

const clientPromise = new MongoClient(process.env.MONGO_DB_URI).connect();

let _testDb;
export function _setTestDb(db) { _testDb = db; }

export async function getDb() {
    if (_testDb) return _testDb;
    try {
        const client = await clientPromise;
        return client.db(process.env.MONGODB_DATABASE);
    } catch (error) {
        throw new Error("Database unavailable", {cause: error});
    }
}

export async function getUsersCollection() {
    const db = await getDb();
    return db.collection("users");
}

export async function getExchangesCollection() {
    const db = await getDb();
    return db.collection("exchanges");
}
