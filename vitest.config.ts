import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['spec/setupTests.js'],
    globalSetup: ['spec/netlify-functions/mongoSetup.js'],
  },
});
