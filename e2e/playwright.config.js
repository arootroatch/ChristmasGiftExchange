import {defineConfig} from '@playwright/test';

export default defineConfig({
    testDir: '.',
    timeout: 30000,
    retries: 0,
    // All tests share one MongoMemoryServer instance — parallel workers would cause DB conflicts
    workers: 1,
    expect: {
        timeout: 10000,
    },
    use: {
        headless: true,
    },
    globalSetup: './globalSetup.js',
    projects: [
        {
            name: 'chromium',
            use: {browserName: 'chromium'},
        },
    ],
});
