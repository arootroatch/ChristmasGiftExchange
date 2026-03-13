import {MongoMemoryServer} from 'mongodb-memory-server';
import {spawn, execSync} from 'child_process';
import {writeFileSync, unlinkSync, readFileSync} from 'fs';
import path from 'path';
import net from 'net';

const STATE_FILE = path.join(import.meta.dirname, '.e2e-state.json');

function cleanupStaleRun() {
    try {
        const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
        unlinkSync(STATE_FILE);
        if (state.port) execSync(`lsof -ti :${state.port} | xargs kill -9 2>/dev/null || true`);
    } catch { /* no stale state */ }
}

function findAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, () => {
            const {port} = server.address();
            server.close(() => resolve(port));
        });
    });
}

async function waitForServer(url, timeoutMs = 60000) {
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

    const port = await findAvailablePort();
    const targetPort = await findAvailablePort();
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    const netlifyDev = spawn('npx', [
        'netlify', 'dev',
        '--port', String(port),
        '--target-port', String(targetPort),
        '--command', `npx vite --port ${targetPort}`,
        '--framework', '#custom',
        '--no-open',
    ], {
        cwd: path.resolve(import.meta.dirname, '..'),
        env: {
            ...process.env,
            MONGO_DB_URI: mongoUri,
            MONGODB_DATABASE: 'e2e-test-db',

        },
        stdio: 'pipe',
    });

    netlifyDev.stdout.on('data', (data) => {
        if (process.env.DEBUG_E2E) console.log(`[netlify dev] ${data}`);
    });
    netlifyDev.stderr.on('data', (data) => {
        if (process.env.DEBUG_E2E) console.error(`[netlify dev] ${data}`);
    });

    await waitForServer(`http://localhost:${port}`);

    writeFileSync(STATE_FILE, JSON.stringify({mongoUri, port}));

    return async () => {
        netlifyDev.kill('SIGTERM');
        await mongoServer.stop();
        try { unlinkSync(STATE_FILE); } catch {}
    };
}
