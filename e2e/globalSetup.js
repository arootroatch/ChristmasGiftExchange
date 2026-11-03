import {setup as startMongo, teardown as stopMongo} from '../spec/shared/mongoSetup.js';
import {execSync} from 'child_process';
import {writeFileSync, unlinkSync, readFileSync} from 'fs';
import path from 'path';
import {createServerDir, findAvailablePort, internalFunctionsSnapshot, removeServerDir, startE2eServer} from './netlifyDevServer.js';

const STATE_FILE = path.join(import.meta.dirname, '.e2e-state.json');

function cleanupStaleRun() {
    try {
        const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
        unlinkSync(STATE_FILE);
        if (state.serverDir) removeServerDir(state.serverDir);
        if (state.port) execSync(`lsof -ti :${state.port} | xargs kill -9 2>/dev/null || true`);
    } catch { /* no stale state */ }
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

    const [[port, targetPort]] = await Promise.all([
        Promise.all([findAvailablePort(), findAvailablePort()]),
        startMongo(),
    ]);
    const mongoUri = process.env.MONGO_DB_URI;

    const internalFunctionsBeforeStart = internalFunctionsSnapshot();
    const serverDir = createServerDir();
    const netlifyDev = startE2eServer({
        serverDir,
        port,
        targetPort,
        env: {
            MONGO_DB_URI: mongoUri,
            MONGODB_DATABASE: 'e2e-test-db',
            JWT_SECRET: 'e2e-test-jwt-secret',
        },
    });

    netlifyDev.stdout.on('data', (data) => {
        if (process.env.DEBUG_E2E) console.log(`[netlify dev] ${data}`);
    });
    netlifyDev.stderr.on('data', (data) => {
        if (process.env.DEBUG_E2E) console.error(`[netlify dev] ${data}`);
    });

    await waitForServer(`http://localhost:${port}`);

    writeFileSync(STATE_FILE, JSON.stringify({mongoUri, port, serverDir, internalFunctionsBeforeStart}));

    return async () => {
        netlifyDev.kill('SIGTERM');
        await stopMongo();
        removeServerDir(serverDir);
        try { unlinkSync(STATE_FILE); } catch {}
    };
}
