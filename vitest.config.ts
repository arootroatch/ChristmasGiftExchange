import {defineConfig} from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['spec/netlify-functions/mongoSetup.js'],
    fileParallelism: false,
    projects: [
      {
        test: {
          name: 'frontend',
          environment: 'jsdom',
          setupFiles: ['spec/setupTests.js'],
          include: [
            'spec/exchange/**/*.spec.js',
            'spec/wishlistEdit/**/*.spec.js',
            'spec/Snackbar.spec.js',
            'spec/utils.spec.js',
            'spec/viteMultiPagePlugin.spec.js',
            'spec/wishlistView.spec.js',
            'spec/reuse.spec.js',
          ],
        },
      },
      {
        test: {
          name: 'backend',
          environment: 'node',
          include: [
            'spec/netlify-functions/**/*.spec.js',
            'spec/integration/**/*.spec.js',
            'spec/dev/**/*.spec.js',
          ],
        },
      },
    ],
  },
});
