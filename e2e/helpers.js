import {MongoClient} from 'mongodb';
import {readFileSync} from 'fs';
import path from 'path';

export {makeUser, makeExchange} from '../spec/shared/testFactories.js';

const STATE_FILE = path.join(import.meta.dirname, '.e2e-state.json');

// Module-level DB state — safe because playwright.config.js enforces workers: 1
let client;
let db;

function requireDB() {
    if (!db) throw new Error('connectDB() must be called before using DB helpers');
    return db;
}

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
    const d = requireDB();
    await d.collection('exchanges').deleteMany({});
    await d.collection('users').deleteMany({});
    await d.collection('legacy-names').deleteMany({});
}

export async function seedUsers(...users) {
    return requireDB().collection('users').insertMany(users);
}

export async function seedExchange(exchange) {
    return requireDB().collection('exchanges').insertOne(exchange);
}

export async function findUser(query) {
    return requireDB().collection('users').findOne(query);
}

export async function findExchange(query) {
    return requireDB().collection('exchanges').findOne(query);
}
