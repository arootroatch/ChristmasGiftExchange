import {MongoMemoryServer} from 'mongodb-memory-server';
import {spawn, execSync} from 'child_process';
import {writeFileSync, unlinkSync, readFileSync} from 'fs';
import path from 'path';
import net from 'net';

const PORT = 8888;
const STATE_FILE = path.join(import.meta.dirname, '.e2e-state.json');

function cleanupStaleRun() {
    try {
        readFileSync(STATE_FILE, 'utf-8');
        unlinkSync(STATE_FILE);
        execSync(`lsof -ti :${PORT} | xargs kill -9 2>/dev/null || true`);
    } catch { /* no stale state */ }
}

function checkPortAvailable(port) {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', () => reject(new Error(
            `Port ${port} is already in use. Stop the other process or use a different port.`
        )));
        server.once('listening', () => server.close(() => resolve()));
        server.listen(port);
    });
}

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
    cleanupStaleRun();
    await checkPortAvailable(PORT);

    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const netlifyDev = spawn('npx', ['netlify', 'dev', '--port', String(PORT), '--no-open'], {
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

    await waitForServer(`http://localhost:${PORT}`);

    writeFileSync(STATE_FILE, JSON.stringify({mongoUri}));

    return async () => {
        netlifyDev.kill('SIGTERM');
        await mongoServer.stop();
        try { unlinkSync(STATE_FILE); } catch {}
    };
}
