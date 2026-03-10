import {MongoClient, ObjectId} from 'mongodb';
import {readFileSync} from 'fs';
import path from 'path';

const STATE_FILE = path.join(import.meta.dirname, '.e2e-state.json');

let client;
let db;

export async function connectDB() {
    let state;
    try {
        state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    } catch {
        throw new Error(`Cannot read ${STATE_FILE}. Is globalSetup running? Check that Playwright config points to globalSetup.js.`);
    }
    client = new MongoClient(state.mongoUri);
    await client.connect();
    db = client.db('e2e-test-db');
    return db;
}

export async function disconnectDB() {
    if (client) await client.close();
}

export async function cleanDB() {
    if (!db) return;
    await db.collection('users').deleteMany({});
    await db.collection('exchanges').deleteMany({});
    await db.collection('legacy-names').deleteMany({});
}

export function makeUser({name, email, token, wishlists, wishItems, _id} = {}) {
    return {
        _id: _id || new ObjectId(),
        name: name || 'Test User',
        email: email || 'test@test.com',
        token: token || crypto.randomUUID(),
        wishlists: wishlists || [],
        wishItems: wishItems || [],
    };
}

export function makeExchange({exchangeId, participants, assignments, houses, isSecretSanta, createdAt} = {}) {
    return {
        exchangeId: exchangeId || 'test-exchange',
        createdAt: createdAt || new Date(),
        isSecretSanta: isSecretSanta ?? false,
        participants: participants || [],
        assignments: assignments || [],
        houses: houses || [],
    };
}

export async function seedUsers(...users) {
    return db.collection('users').insertMany(users);
}

export async function seedExchange(exchange) {
    return db.collection('exchanges').insertOne(exchange);
}

export async function findUser(query) {
    return db.collection('users').findOne(query);
}

export async function findExchange(query) {
    return db.collection('exchanges').findOne(query);
}
