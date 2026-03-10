import {MongoMemoryServer} from 'mongodb-memory-server';
import {spawn} from 'child_process';
import {writeFileSync, unlinkSync} from 'fs';
import path from 'path';

const STATE_FILE = path.join(import.meta.dirname, '.e2e-state.json');

async function waitForServer(url, timeoutMs = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const response = await fetch(url);
            if (response.ok || response.status === 404) return;
        } catch {}
        await new Promise(r => setTimeout(r, 500));
    }
    throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

export default async function globalSetup() {
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const netlifyDev = spawn('npx', ['netlify', 'dev', '--port', '8888'], {
        cwd: path.resolve(import.meta.dirname, '..'),
        env: {
            ...process.env,
            MONGO_DB_URI: mongoUri,
            MONGODB_DATABASE: 'e2e-test-db',
            MONGODB_COLLECTION: 'legacy-names',
        },
        stdio: 'pipe',
    });

    netlifyDev.stdout.on('data', (data) => {
        if (process.env.DEBUG_E2E) console.log(`[netlify dev] ${data}`);
    });
    netlifyDev.stderr.on('data', (data) => {
        if (process.env.DEBUG_E2E) console.error(`[netlify dev] ${data}`);
    });

    await waitForServer('http://localhost:8888');

    // Save state for test helpers (DB seeding needs the URI)
    writeFileSync(STATE_FILE, JSON.stringify({mongoUri}));

    // Return teardown function — MongoMemoryServer instance is in closure
    return async () => {
        netlifyDev.kill('SIGTERM');
        await mongoServer.stop();
        try { unlinkSync(STATE_FILE); } catch {}
    };
}
