import { MongoClient } from "mongodb";

const uri = process.env.MONGO_DB_URI;
const clientPromise = new MongoClient(uri).connect();

export async function getDb() {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DATABASE);
}

export async function getUsersCollection() {
  const db = await getDb();
  return db.collection("users");
}

export async function getExchangesCollection() {
  const db = await getDb();
  return db.collection("exchanges");
}

export async function getLegacyCollection() {
  const db = await getDb();
  return db.collection(process.env.MONGODB_COLLECTION);
}
