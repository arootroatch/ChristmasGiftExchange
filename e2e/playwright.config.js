import {defineConfig} from '@playwright/test';

export default defineConfig({
    testDir: '.',
    timeout: 30000,
    retries: 0,
    use: {
        baseURL: 'http://localhost:8888',
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
