import {MongoClient} from 'mongodb';
import {readFileSync} from 'fs';
import path from 'path';

const STATE_FILE = path.join(import.meta.dirname, '.e2e-state.json');
const JWT_SECRET = 'e2e-test-jwt-secret';

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

    // Set env vars needed by shared auth modules
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.MONGO_DB_URI = state.mongoUri;
    process.env.MONGODB_DATABASE = 'e2e-test-db';

    return db;
}

export async function disconnectDB() {
    if (client) await client.close();
}

export async function cleanDB() {
    const d = requireDB();
    await Promise.all([
        d.collection('exchanges').deleteMany({}),
        d.collection('users').deleteMany({}),
        d.collection('legacy-names').deleteMany({}),
        d.collection('authCodes').deleteMany({}),
        d.collection('rateLimits').deleteMany({}),
    ]);
}

export function getDB() {
    return requireDB();
}

/**
 * Authenticate programmatically by generating a code and calling the verify endpoint.
 * Sets the session cookie on the page context without going through the UI.
 */
export async function authenticateUser(page, baseURL, email, name) {
    const {generateAndStoreCode} = await import('../netlify/shared/authCodes.mjs');
    const code = await generateAndStoreCode(email);
    await page.request.post(`${baseURL}/.netlify/functions/api-auth-verify-post`, {
        data: {email, code, ...(name && {name})},
    });
}

/**
 * Authenticate through the auth gate UI. Pre-generates a known code, intercepts the
 * send-code API to prevent overwriting it, then fills in the auth gate form.
 */
export async function authenticateViaUI(page, email, name) {
    const {generateAndStoreCode} = await import('../netlify/shared/authCodes.mjs');
    const code = await generateAndStoreCode(email);

    // Intercept the code-send API so it doesn't generate a new code that overwrites ours
    await page.route('**/api-auth-code-post', route => {
        route.fulfill({status: 200, body: JSON.stringify({sent: true}), contentType: 'application/json'});
    });

    if (name) {
        await page.locator('#auth-name').fill(name);
    }
    await page.locator('#auth-email').fill(email);
    await page.locator('#auth-send-code').click();

    // Code step appears
    await page.locator('#auth-code').fill(code);

    // Unroute so the verify call goes through normally
    await page.unroute('**/api-auth-code-post');

    await page.locator('#auth-verify-code').click();
}
