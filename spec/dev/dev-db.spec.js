import {describe, it, expect, vi} from 'vitest';

vi.mock('node:child_process', () => ({
    execSync: vi.fn(),
}));

describe('resolveEnvFilePath', () => {
    it('resolves .env.local to the repo root when git-common-dir is absolute (worktree)', async () => {
        const {execSync} = await import('node:child_process');
        execSync.mockReturnValue('/Users/alex/project/.git\n');
        const {resolveEnvFilePath} = await import('../../dev/dev-db.mjs');
        expect(resolveEnvFilePath()).toBe('/Users/alex/project/.env.local');
    });

    it('resolves .env.local to the repo root when git-common-dir is relative to cwd (main checkout)', async () => {
        vi.resetModules();
        const {execSync} = await import('node:child_process');
        execSync.mockReturnValue('.git\n');
        const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue('/Users/alex/project');
        const {resolveEnvFilePath} = await import('../../dev/dev-db.mjs');
        expect(resolveEnvFilePath()).toBe('/Users/alex/project/.env.local');
        cwdSpy.mockRestore();
    });
});
