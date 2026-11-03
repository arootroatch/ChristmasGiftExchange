import {spawn} from 'child_process';
import {cpSync, existsSync, mkdtempSync, readdirSync, realpathSync, rmSync, statSync, symlinkSync} from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');

const NOT_COPIED = new Set(['.git', '.netlify', '.playwright-mcp', '.claude', 'node_modules', 'dist', 'coverage', 'test-results', 'playwright-report']);

export function findAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.once('error', reject);
        server.listen(0, () => {
            const {port} = server.address();
            server.close(() => resolve(port));
        });
    });
}

/** What a server starting in the checkout would disturb; see dev-server-isolation.spec.js. */
export function internalFunctionsSnapshot() {
    const dir = path.join(PROJECT_ROOT, '.netlify', 'functions-internal');
    if (!existsSync(dir)) return null;
    return {mtimeMs: statSync(dir).mtimeMs, files: readdirSync(dir).sort()};
}

/** Copies the project somewhere with its own .netlify. Env files stay behind; e2e passes its own env. */
export function createServerDir() {
    const serverDir = mkdtempSync(path.join(realpathSync(os.tmpdir()), 'gift-exchange-e2e-'));
    cpSync(PROJECT_ROOT, serverDir, {
        recursive: true,
        filter: (source) => {
            const name = path.basename(source);
            return source === PROJECT_ROOT || !(NOT_COPIED.has(name) || name.startsWith('.env'));
        },
    });
    symlinkSync(path.join(PROJECT_ROOT, 'node_modules'), path.join(serverDir, 'node_modules'));
    return serverDir;
}

export function removeServerDir(serverDir) {
    rmSync(serverDir, {recursive: true, force: true, maxRetries: 5, retryDelay: 200});
}

export function startE2eServer({serverDir, port, targetPort, env}) {
    return spawn('npx', [
        'netlify', 'dev',
        '--offline',
        '--port', String(port),
        '--target-port', String(targetPort),
        '--command', `npx vite --port ${targetPort} --host`,
        '--framework', '#custom',
        '--functions', 'netlify/functions',
        '--no-open',
    ], {
        cwd: serverDir,
        env: {...process.env, ...env},
        stdio: 'pipe',
    });
}
